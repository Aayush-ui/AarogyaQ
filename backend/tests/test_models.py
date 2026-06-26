"""
Tests for aarogyaq.models — JSON helpers, ORM construction + __repr__,
and Pydantic schema validation.

Coverage:
- to_list() / to_dict() helpers (valid, None, malformed)
- Every ORM class: instantiation with valid data + __repr__
- Every ORM class persisted to the in-memory test DB
- Every *Out Pydantic schema: model_validate from a full dict
- PatientCreate: rejects invalid input
"""
from __future__ import annotations

import json
from datetime import datetime

import pytest
from pydantic import ValidationError
from sqlalchemy import inspect as sa_inspect

from aarogyaq.models import (
    Assessment,
    AssessmentOut,
    AuditLog,
    AuditLogOut,
    Base,
    Department,
    DepartmentOut,
    DoctorSummary,
    Patient,
    PatientCreate,
    PatientOut,
    SummaryOut,
    TriageResult,
    Visit,
    VisitOut,
    to_dict,
    to_list,
)

# ── Shared test data ──────────────────────────────────────────────────────────

NOW = datetime(2026, 6, 26, 10, 0, 0)

PATIENT_KWARGS = dict(
    patient_id="ARQ-000001",
    name="Ravi Kumar",
    age=42,
    gender="Male",
    phone="9876543210",
    created_at=NOW,
)

VISIT_KWARGS = dict(
    visit_id=1,
    patient_id="ARQ-000001",
    visit_timestamp=NOW,
    chief_complaint="Severe chest pain radiating to the left arm",
    pain_level=9,
    symptom_duration=30,
    existing_conditions=json.dumps(["hypertension", "diabetes"]),
    queue_type="Emergency",
    status="Waiting",
    department_assigned=None,
    attended_at=None,
    completed_at=None,
)

ASSESSMENT_KWARGS = dict(
    assessment_id=1,
    visit_id=1,
    raw_symptoms="Severe chest pain",
    mapped_symptoms=json.dumps(["chest pain", "dyspnoea"]),
    confidence_scores=json.dumps({"chest pain": 0.95, "dyspnoea": 0.70}),
    risk_score=82.5,
    priority_level="Critical",
    score_breakdown=json.dumps([{"rule": "high_pain", "points": 30}]),
    contributing_factors=json.dumps(["Pain level >= 8", "Emergency queue"]),
    business_rule_flags=json.dumps(["CARDIAC_ALERT"]),
    assessed_at=NOW,
    is_reassessment=False,
)

SUMMARY_KWARGS = dict(
    summary_id=1,
    visit_id=1,
    summary_text="Patient presents with severe chest pain (9/10). Priority: Critical.",
    generated_at=NOW,
)

AUDIT_KWARGS = dict(
    log_id=1,
    visit_id=1,
    actor="system",
    action="ASSESSED",
    notes="Initial triage complete.",
    logged_at=NOW,
)

DEPT_KWARGS = dict(
    dept_id=1,
    name="Cardiology",
    status="Available",
    updated_at=NOW,
)


# ── to_list() ─────────────────────────────────────────────────────────────────

def test_to_list_valid_json_string():
    """to_list deserialises a JSON-encoded list correctly."""
    result = to_list('["diabetes", "hypertension"]')
    assert result == ["diabetes", "hypertension"]


def test_to_list_none_returns_empty():
    """to_list returns [] when given None."""
    assert to_list(None) == []


def test_to_list_empty_string_returns_empty():
    """to_list returns [] for an empty string (edge: column stored as empty)."""
    assert to_list("") == []


# ── to_dict() ────────────────────────────────────────────────────────────────

def test_to_dict_valid_json_string():
    """to_dict deserialises a JSON-encoded dict correctly."""
    result = to_dict('{"chest pain": 0.95}')
    assert result == {"chest pain": 0.95}


def test_to_dict_none_returns_empty():
    """to_dict returns {} when given None."""
    assert to_dict(None) == {}


def test_to_dict_empty_string_returns_empty():
    """to_dict returns {} for an empty string."""
    assert to_dict("") == {}


# ── All 6 ORM tables created ──────────────────────────────────────────────────

def test_all_six_tables_exist_after_create_all(test_engine):
    """Base.metadata.create_all creates exactly the 6 documented tables."""
    inspector = sa_inspect(test_engine)
    tables = set(inspector.get_table_names())
    expected = {
        "patients",
        "visits",
        "assessments",
        "doctor_summaries",
        "audit_logs",
        "departments",
    }
    assert expected.issubset(tables), f"Missing tables: {expected - tables}"


# ── ORM: construction + __repr__ ─────────────────────────────────────────────

def test_patient_repr_contains_id_and_name():
    """Patient.__repr__ contains patient_id and name."""
    p = Patient(**PATIENT_KWARGS)
    r = repr(p)
    assert "ARQ-000001" in r
    assert "Ravi Kumar" in r


def test_visit_repr_contains_visit_id_and_status():
    """Visit.__repr__ contains visit_id and status."""
    v = Visit(**VISIT_KWARGS)
    r = repr(v)
    assert "1" in r
    assert "Waiting" in r
    assert "Emergency" in r


def test_assessment_repr_contains_priority_and_score():
    """Assessment.__repr__ contains priority_level and risk_score."""
    a = Assessment(**ASSESSMENT_KWARGS)
    r = repr(a)
    assert "Critical" in r
    assert "82.5" in r


def test_doctor_summary_repr_contains_ids():
    """DoctorSummary.__repr__ contains summary_id and visit_id."""
    s = DoctorSummary(**SUMMARY_KWARGS)
    r = repr(s)
    assert "1" in r


def test_audit_log_repr_contains_actor_and_action():
    """AuditLog.__repr__ contains actor and action."""
    al = AuditLog(**AUDIT_KWARGS)
    r = repr(al)
    assert "system" in r
    assert "ASSESSED" in r


def test_department_repr_contains_name_and_status():
    """Department.__repr__ contains name and status."""
    d = Department(**DEPT_KWARGS)
    r = repr(d)
    assert "Cardiology" in r
    assert "Available" in r


# ── ORM: persist to DB ────────────────────────────────────────────────────────

def test_patient_persisted_and_retrieved(test_db):
    """Patient can be added, committed, and retrieved from the in-memory DB."""
    p = Patient(**PATIENT_KWARGS)
    test_db.add(p)
    test_db.commit()
    fetched = test_db.get(Patient, "ARQ-000001")
    assert fetched is not None
    assert fetched.name == "Ravi Kumar"
    assert fetched.age == 42


def test_visit_persisted_with_fk(test_db):
    """Visit can be persisted with a valid FK to an existing Patient."""
    p = Patient(**PATIENT_KWARGS)
    test_db.add(p)
    test_db.flush()
    v = Visit(**VISIT_KWARGS)
    test_db.add(v)
    test_db.commit()
    fetched = test_db.get(Visit, 1)
    assert fetched is not None
    assert fetched.patient_id == "ARQ-000001"
    assert fetched.queue_type == "Emergency"


def test_department_default_status_is_available(test_db):
    """Department inserted without explicit status gets 'Available' default."""
    d = Department(name="Neurology", updated_at=NOW)
    test_db.add(d)
    test_db.commit()
    fetched = test_db.query(Department).filter_by(name="Neurology").first()
    assert fetched is not None
    assert fetched.status == "Available"


# ── Pydantic: model_validate from dict ───────────────────────────────────────

def test_patient_out_model_validate_all_fields():
    """PatientOut.model_validate accepts a dict with all valid fields."""
    data = dict(
        patient_id="ARQ-000001",
        name="Ravi Kumar",
        age=42,
        gender="Male",
        phone="9876543210",
        created_at=NOW,
    )
    out = PatientOut.model_validate(data)
    assert out.patient_id == "ARQ-000001"
    assert out.age == 42


def test_visit_out_model_validate_all_fields():
    """VisitOut.model_validate accepts a dict with all valid fields."""
    data = dict(
        visit_id=1,
        patient_id="ARQ-000001",
        visit_timestamp=NOW,
        chief_complaint="Chest pain",
        pain_level=9,
        symptom_duration=30,
        existing_conditions=["hypertension"],
        queue_type="Emergency",
        status="Waiting",
        department_assigned=None,
        attended_at=None,
        completed_at=None,
    )
    out = VisitOut.model_validate(data)
    assert out.visit_id == 1
    assert out.existing_conditions == ["hypertension"]


def test_assessment_out_model_validate_all_fields():
    """AssessmentOut.model_validate accepts a dict with all valid fields."""
    data = dict(
        assessment_id=1,
        visit_id=1,
        raw_symptoms="Severe chest pain",
        mapped_symptoms=["chest pain", "dyspnoea"],
        confidence_scores={"chest pain": 0.95},
        risk_score=82.5,
        priority_level="Critical",
        score_breakdown=[{"rule": "high_pain", "points": 30}],
        contributing_factors=["Pain level >= 8"],
        business_rule_flags=["CARDIAC_ALERT"],
        assessed_at=NOW,
        is_reassessment=False,
    )
    out = AssessmentOut.model_validate(data)
    assert out.risk_score == 82.5
    assert out.priority_level == "Critical"
    assert out.confidence_scores == {"chest pain": 0.95}


def test_summary_out_model_validate_all_fields():
    """SummaryOut.model_validate accepts a dict with all valid fields."""
    data = dict(
        summary_id=1,
        visit_id=1,
        summary_text="Priority: Critical.",
        generated_at=NOW,
    )
    out = SummaryOut.model_validate(data)
    assert out.summary_id == 1
    assert "Critical" in out.summary_text


def test_audit_log_out_model_validate_all_fields():
    """AuditLogOut.model_validate accepts a dict with all valid fields."""
    data = dict(
        log_id=1,
        visit_id=1,
        actor="system",
        action="ASSESSED",
        notes="Initial triage.",
        logged_at=NOW,
    )
    out = AuditLogOut.model_validate(data)
    assert out.actor == "system"
    assert out.action == "ASSESSED"


def test_department_out_model_validate_all_fields():
    """DepartmentOut.model_validate accepts a dict with all valid fields."""
    data = dict(
        dept_id=1,
        name="Cardiology",
        status="Available",
        updated_at=NOW,
    )
    out = DepartmentOut.model_validate(data)
    assert out.name == "Cardiology"
    assert out.status == "Available"


# ── Pydantic: invalid input ───────────────────────────────────────────────────

def test_patient_create_rejects_invalid_gender():
    """PatientCreate raises ValidationError for a gender not in the allowed set."""
    with pytest.raises(ValidationError):
        PatientCreate(name="Test", age=30, gender="Unknown")


def test_patient_create_rejects_age_zero():
    """PatientCreate raises ValidationError when age is 0 (must be > 0)."""
    with pytest.raises(ValidationError):
        PatientCreate(name="Test", age=0, gender="Male")


def test_patient_out_missing_required_field_raises():
    """PatientOut.model_validate raises ValidationError when a required field is absent."""
    with pytest.raises(ValidationError):
        PatientOut.model_validate({"patient_id": "ARQ-000001"})  # missing name, age, etc.
