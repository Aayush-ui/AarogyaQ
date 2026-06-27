"""
Single responsibility: declare all SQLAlchemy ORM table models and Pydantic
request/response schemas used across the AarogyaQ backend.

Column names match ``backend/docs/DB_DESIGN.md`` exactly and must not be
changed without updating the design document.

Module-level helpers ``to_list()`` and ``to_dict()`` deserialise the JSON TEXT
columns that SQLite stores as plain strings.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import declarative_base, relationship


# ── JSON column helpers ───────────────────────────────────────────────────────

def to_list(text: str | None) -> list[Any]:
    """Deserialise a JSON-encoded list stored in a TEXT column.

    Args:
        text: A JSON-serialised list string, or ``None`` / empty string.

    Returns:
        A Python list.  Returns ``[]`` when *text* is ``None`` or empty.

    Raises:
        json.JSONDecodeError: if *text* is non-null but is not valid JSON.
    """
    if not text:
        return []
    return json.loads(text)


def to_dict(text: str | None) -> dict[str, Any]:
    """Deserialise a JSON-encoded dict stored in a TEXT column.

    Args:
        text: A JSON-serialised dict string, or ``None`` / empty string.

    Returns:
        A Python dict.  Returns ``{}`` when *text* is ``None`` or empty.

    Raises:
        json.JSONDecodeError: if *text* is non-null but is not valid JSON.
    """
    if not text:
        return {}
    return json.loads(text)


# ── Declarative base ──────────────────────────────────────────────────────────

Base = declarative_base()


# ── ORM Models ────────────────────────────────────────────────────────────────

class Patient(Base):
    """ORM model for the ``patients`` table.

    One row per unique patient; a patient may accumulate many visits.
    """

    __tablename__ = "patients"

    patient_id = sa.Column(sa.String, primary_key=True)
    name       = sa.Column(sa.String,  nullable=False)
    age        = sa.Column(sa.Integer, nullable=False)
    gender     = sa.Column(sa.String,  nullable=False)
    phone      = sa.Column(sa.String,  nullable=True)
    created_at = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visits = relationship("Visit", back_populates="patient")

    def __repr__(self) -> str:
        return (
            f"<Patient patient_id={self.patient_id!r} "
            f"name={self.name!r} age={self.age} gender={self.gender!r}>"
        )


class Visit(Base):
    """ORM model for the ``visits`` table.

    One row per patient encounter.  ``existing_conditions`` is stored as a
    JSON-serialised ``list[str]``; use ``to_list(visit.existing_conditions)``
    to deserialise.
    """

    __tablename__ = "visits"

    visit_id            = sa.Column(sa.Integer,  primary_key=True, autoincrement=True)
    patient_id          = sa.Column(sa.String,   sa.ForeignKey("patients.patient_id"), nullable=False)
    visit_timestamp     = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)
    chief_complaint     = sa.Column(sa.Text,     nullable=False)
    pain_level          = sa.Column(sa.Integer,  nullable=False)
    symptom_duration    = sa.Column(sa.Integer,  nullable=True)
    existing_conditions = sa.Column(sa.Text,     nullable=True)   # JSON list[str]
    queue_type          = sa.Column(sa.String,   nullable=False)
    status              = sa.Column(sa.String,   nullable=False)
    department_assigned = sa.Column(sa.String,   nullable=True)
    attended_at         = sa.Column(sa.DateTime, nullable=True)
    completed_at        = sa.Column(sa.DateTime, nullable=True)
    bed_assigned        = sa.Column(sa.String,   nullable=True)

    patient        = relationship("Patient",       back_populates="visits")
    assessments    = relationship("Assessment",    back_populates="visit")
    doctor_summary = relationship("DoctorSummary", back_populates="visit", uselist=False)
    audit_logs     = relationship("AuditLog",      back_populates="visit")
    vitals         = relationship("Vitals",        back_populates="visit", uselist=False)
    clinical_notes = relationship("ClinicalNote",  back_populates="visit")
    medication_orders = relationship("MedicationOrder", back_populates="visit")
    laboratory_orders = relationship("LabOrder",   back_populates="visit")
    radiology_orders = relationship("RadiologyOrder", back_populates="visit")

    def __repr__(self) -> str:
        return (
            f"<Visit visit_id={self.visit_id} "
            f"patient_id={self.patient_id!r} "
            f"queue_type={self.queue_type!r} status={self.status!r}>"
        )


class Assessment(Base):
    """ORM model for the ``assessments`` table.

    One row per triage event (initial or reassessment).  All JSON columns are
    stored as TEXT; use ``to_list()`` / ``to_dict()`` to deserialise.

    The most-recent row for a given ``visit_id`` is the active assessment.
    """

    __tablename__ = "assessments"

    assessment_id       = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id            = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=False)
    raw_symptoms        = sa.Column(sa.Text,    nullable=False)
    mapped_symptoms     = sa.Column(sa.Text,    nullable=True)   # JSON list[str]
    confidence_scores   = sa.Column(sa.Text,    nullable=True)   # JSON dict[str, float]
    risk_score          = sa.Column(sa.Float,   nullable=False)
    priority_level      = sa.Column(sa.String,  nullable=False)
    score_breakdown     = sa.Column(sa.Text,    nullable=False)  # JSON list[dict]
    contributing_factors = sa.Column(sa.Text,   nullable=False)  # JSON list[str]
    business_rule_flags = sa.Column(sa.Text,    nullable=True)   # JSON list[str]
    assessed_at         = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)
    is_reassessment     = sa.Column(sa.Boolean,  nullable=False, default=False)

    visit = relationship("Visit", back_populates="assessments")

    def __repr__(self) -> str:
        return (
            f"<Assessment assessment_id={self.assessment_id} "
            f"visit_id={self.visit_id} "
            f"priority_level={self.priority_level!r} "
            f"risk_score={self.risk_score} "
            f"is_reassessment={self.is_reassessment}>"
        )


class DoctorSummary(Base):
    """ORM model for the ``doctor_summaries`` table.

    At most one active summary per visit, enforced by ``UNIQUE(visit_id)``.
    Regenerating a summary replaces (upserts) the existing row.
    """

    __tablename__ = "doctor_summaries"

    summary_id   = sa.Column(sa.Integer,  primary_key=True, autoincrement=True)
    visit_id     = sa.Column(sa.Integer,  sa.ForeignKey("visits.visit_id"), nullable=False, unique=True)
    summary_text = sa.Column(sa.Text,     nullable=False)
    generated_at = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="doctor_summary")

    def __repr__(self) -> str:
        return (
            f"<DoctorSummary summary_id={self.summary_id} "
            f"visit_id={self.visit_id} "
            f"generated_at={self.generated_at}>"
        )


class AuditLog(Base):
    """ORM model for the ``audit_logs`` table.

    Append-only event log.  Rows are never updated or deleted after creation.
    ``visit_id`` may be ``NULL`` for system-level events not tied to a visit.
    """

    __tablename__ = "audit_logs"

    log_id    = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id  = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=True)
    actor     = sa.Column(sa.String,  nullable=False)
    action    = sa.Column(sa.String,  nullable=False)
    notes     = sa.Column(sa.Text,    nullable=True)
    logged_at = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="audit_logs")

    def __repr__(self) -> str:
        return (
            f"<AuditLog log_id={self.log_id} "
            f"actor={self.actor!r} action={self.action!r} "
            f"visit_id={self.visit_id}>"
        )


class Department(Base):
    """ORM model for the ``departments`` table.

    Standalone reference table.  Department name is stored as a plain string
    in ``visits.department_assigned``; this table tracks availability status.
    """

    __tablename__ = "departments"

    dept_id    = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    name       = sa.Column(sa.String,  nullable=False, unique=True)
    status     = sa.Column(sa.String,  nullable=False, default="Available")
    updated_at = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<Department dept_id={self.dept_id} "
            f"name={self.name!r} status={self.status!r}>"
        )


class Vitals(Base):
    """ORM model for the ``vitals`` table."""
    __tablename__ = "vitals"

    vital_id         = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id         = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=False, unique=True)
    heart_rate       = sa.Column(sa.Integer, nullable=True)
    systolic_bp      = sa.Column(sa.Integer, nullable=True)
    diastolic_bp     = sa.Column(sa.Integer, nullable=True)
    respiratory_rate = sa.Column(sa.Integer, nullable=True)
    spo2             = sa.Column(sa.Integer, nullable=True)
    temperature      = sa.Column(sa.Float,   nullable=True)
    logged_at        = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="vitals")


class ClinicalNote(Base):
    """ORM model for the ``clinical_notes`` table."""
    __tablename__ = "clinical_notes"

    note_id   = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id  = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=False)
    author    = sa.Column(sa.String,  nullable=False)
    note      = sa.Column(sa.Text,    nullable=False)
    timestamp = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="clinical_notes")


class MedicationOrder(Base):
    """ORM model for the ``medication_orders`` table."""
    __tablename__ = "medication_orders"

    order_id  = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id  = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=False)
    doctor    = sa.Column(sa.String,  nullable=False)
    name      = sa.Column(sa.String,  nullable=False)
    dosage    = sa.Column(sa.String,  nullable=False)
    frequency = sa.Column(sa.String,  nullable=False)
    status    = sa.Column(sa.String,  nullable=False, default="Pending")
    timestamp = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="medication_orders")


class LabOrder(Base):
    """ORM model for the ``laboratory_orders`` table."""
    __tablename__ = "laboratory_orders"

    order_id  = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id  = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=False)
    doctor    = sa.Column(sa.String,  nullable=False)
    test_name = sa.Column(sa.String,  nullable=False)
    status    = sa.Column(sa.String,  nullable=False, default="Ordered")
    result    = sa.Column(sa.Text,    nullable=True)
    timestamp = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="laboratory_orders")


class RadiologyOrder(Base):
    """ORM model for the ``radiology_orders`` table."""
    __tablename__ = "radiology_orders"

    order_id  = sa.Column(sa.Integer, primary_key=True, autoincrement=True)
    visit_id  = sa.Column(sa.Integer, sa.ForeignKey("visits.visit_id"), nullable=False)
    doctor    = sa.Column(sa.String,  nullable=False)
    scan_type = sa.Column(sa.String,  nullable=False)
    status    = sa.Column(sa.String,  nullable=False, default="Ordered")
    result    = sa.Column(sa.Text,    nullable=True)
    timestamp = sa.Column(sa.DateTime, nullable=False, default=datetime.utcnow)

    visit = relationship("Visit", back_populates="radiology_orders")


# ── Pydantic input schemas ────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    """Input schema for registering a new patient."""

    name:   str       = Field(min_length=1, max_length=200)
    age:    int       = Field(gt=0, lt=150, description="Age in years")
    gender: str       = Field(pattern=r"^(Male|Female|Other)$")
    phone:  str | None = Field(default=None, max_length=20)


class VisitCreate(BaseModel):
    """Input schema for opening a new patient visit (nurse intake form)."""

    patient_id:          str
    chief_complaint:     str            = Field(min_length=1)
    pain_level:          int            = Field(ge=1, le=10)
    symptom_duration:    int | None     = Field(default=None, ge=0, description="Duration in minutes")
    existing_conditions: list[str]      = Field(default_factory=list)
    queue_type:          str            = Field(pattern=r"^(Emergency|General)$")


class DepartmentStatusUpdate(BaseModel):
    """Input schema for changing a department's availability status."""

    status: str = Field(pattern=r"^(Available|Busy|Full)$")


class VisitStatusUpdate(BaseModel):
    """Input schema for updating a visit's workflow status."""

    status:              str       = Field(pattern=r"^(Waiting|Attending|Completed)$")
    department_assigned: str | None = None


# ── Pydantic output schemas ───────────────────────────────────────────────────

class PatientOut(BaseModel):
    """Response schema for patient records.

    Fields: patient_id, name, age, gender, phone, created_at.
    """

    model_config = ConfigDict(from_attributes=True)

    patient_id: str
    name:       str
    age:        int
    gender:     str
    phone:      str | None
    created_at: datetime


class VitalsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vital_id:         int
    visit_id:         int
    heart_rate:       int | None
    systolic_bp:      int | None
    diastolic_bp:     int | None
    respiratory_rate: int | None
    spo2:             int | None
    temperature:      float | None
    logged_at:        datetime

class ClinicalNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    note_id:   int
    visit_id:  int
    author:    str
    note:      str
    timestamp: datetime

class MedicationOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    order_id:  int
    visit_id:  int
    doctor:    str
    name:      str
    dosage:    str
    frequency: str
    status:    str
    timestamp: datetime

class LabOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    order_id:  int
    visit_id:  int
    doctor:    str
    test_name: str
    status:    str
    result:    str | None
    timestamp: datetime

class RadiologyOrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    order_id:  int
    visit_id:  int
    doctor:    str
    scan_type: str
    status:    str
    result:    str | None
    timestamp: datetime

class VisitOut(BaseModel):
    """Response schema for visit records — all visit fields.

    Note: ``existing_conditions`` is stored as JSON TEXT in the ORM.
    Service-layer code must call ``to_list(orm.existing_conditions)`` before
    constructing this schema from an ORM instance.
    """

    model_config = ConfigDict(from_attributes=True)

    visit_id:            int
    patient_id:          str
    visit_timestamp:     datetime
    chief_complaint:     str
    pain_level:          int
    symptom_duration:    int | None
    existing_conditions: list[str]
    queue_type:          str
    status:              str
    department_assigned: str | None = None
    bed_assigned:        str | None = None
    attended_at:         datetime | None = None
    completed_at:        datetime | None = None
    vitals:              VitalsOut | None = None
    clinical_notes:      list[ClinicalNoteOut] = Field(default_factory=list)
    medication_orders:   list[MedicationOrderOut] = Field(default_factory=list)
    laboratory_orders:   list[LabOrderOut] = Field(default_factory=list)
    radiology_orders:    list[RadiologyOrderOut] = Field(default_factory=list)


class AssessmentOut(BaseModel):
    """Response schema for triage assessment records — all assessment fields.

    JSON TEXT columns are exposed as their proper Python types; the service
    layer must deserialise with ``to_list()`` / ``to_dict()`` before building
    this schema from an ORM instance.
    """

    model_config = ConfigDict(from_attributes=True)

    assessment_id:       int
    visit_id:            int
    raw_symptoms:        str
    mapped_symptoms:     list[str]
    confidence_scores:   dict[str, float]
    risk_score:          float
    priority_level:      str
    score_breakdown:     list[dict[str, Any]]
    contributing_factors: list[str]
    business_rule_flags: list[str]
    assessed_at:         datetime
    is_reassessment:     bool


class SummaryOut(BaseModel):
    """Response schema for doctor summary records."""

    model_config = ConfigDict(from_attributes=True)

    summary_id:   int
    visit_id:     int
    summary_text: str
    generated_at: datetime


class AuditLogOut(BaseModel):
    """Response schema for audit log entries."""

    model_config = ConfigDict(from_attributes=True)

    log_id:    int
    visit_id:  int | None
    actor:     str
    action:    str
    notes:     str | None
    logged_at: datetime


class DepartmentOut(BaseModel):
    """Response schema for department records."""

    model_config = ConfigDict(from_attributes=True)

    dept_id:    int
    name:       str
    status:     str
    updated_at: datetime


class TriageResult(BaseModel):
    """Composite response returned after a complete triage workflow run."""

    patient:    PatientOut
    visit:      VisitOut
    assessment: AssessmentOut
    summary:    SummaryOut


# ── Backward-compatible aliases ───────────────────────────────────────────────
# Existing stubs (api.py, orchestrator.py) import the old *Response names;
# these aliases keep them importable until those stubs are updated.

PatientResponse      = PatientOut
VisitResponse        = VisitOut
AssessmentResponse   = AssessmentOut
DoctorSummaryResponse = SummaryOut
AuditLogResponse     = AuditLogOut
DepartmentResponse   = DepartmentOut
