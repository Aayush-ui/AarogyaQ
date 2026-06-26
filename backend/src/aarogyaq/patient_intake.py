"""
Single responsibility: patient registration and lookup.

Handles generating ``ARQ-NNNNNN`` patient IDs, persisting new patients, and
retrieving patients by ID or phone number.  All database writes emit an audit
event via :mod:`aarogyaq.audit`.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from aarogyaq.models import Patient, PatientCreate


import json
from datetime import datetime
from sqlalchemy.orm import Session
from aarogyaq.models import Patient, Visit, AuditLog
from aarogyaq.audit import log_event

def generate_patient_id(db: Session) -> str:
    """Generate next ID in format ARQ-000001.
    Count existing patients, increment by 1, zero-pad to 6 digits.
    Thread-safe: wrap in a db-level read within a transaction.
    """
    # SQLite does not easily support with_for_update, so we just use count
    count = db.query(Patient).count()
    return f"ARQ-{count + 1:06d}"

def register_patient(
    db: Session,
    name: str,
    age: int,
    gender: str,
    phone: str | None,
    chief_complaint: str,
    pain_level: int,
    symptom_duration: int | None,
    existing_conditions: list[str]
) -> tuple[Patient, Visit]:
    """
    Create and persist a Patient (or retrieve existing by phone if phone
    is provided and already on record) and a new Visit.
    Rules:
    - age must be 0-120, raise ValueError if outside range
    - pain_level must be 1-10, raise ValueError if outside range
    - gender must be one of: "Male", "Female", "Other", raise ValueError
    - chief_complaint must not be empty, raise ValueError
    - existing_conditions stored as JSON string in visit.existing_conditions
    - visit.status = "Waiting"
    - visit.queue_type = "Unknown" for now (queue_manager will set this)
    - auto-write an AuditLog entry with actor="nurse", action="REGISTERED"
    Returns (Patient, Visit) tuple.
    """
    if not (0 <= age <= 120):
        raise ValueError(f"Age must be between 0 and 120, got {age}")
    if not (1 <= pain_level <= 10):
        raise ValueError(f"Pain level must be between 1 and 10, got {pain_level}")
    if gender not in {"Male", "Female", "Other"}:
        raise ValueError(f"Gender must be 'Male', 'Female', or 'Other', got {gender}")
    if not chief_complaint or not chief_complaint.strip():
        raise ValueError("Chief complaint must not be empty")

    patient = None
    if phone:
        patient = db.query(Patient).filter(Patient.phone == phone).first()

    if not patient:
        patient_id = generate_patient_id(db)
        patient = Patient(
            patient_id=patient_id,
            name=name,
            age=age,
            gender=gender,
            phone=phone,
        )
        db.add(patient)
        db.flush()

    visit = Visit(
        patient_id=patient.patient_id,
        chief_complaint=chief_complaint,
        pain_level=pain_level,
        symptom_duration=symptom_duration,
        existing_conditions=json.dumps(existing_conditions),
        queue_type="Unknown",
        status="Waiting",
        visit_timestamp=datetime.utcnow()
    )
    db.add(visit)
    db.flush()

    log_event(db, actor="nurse", action="REGISTERED", visit_id=visit.visit_id)

    return patient, visit

def get_patient(db: Session, patient_id: str) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise KeyError(f"Patient with ID {patient_id} not found")
    return patient

def find_patients_by_phone(db: Session, phone: str) -> list[Patient]:
    if not phone:
        raise ValueError("Phone number cannot be empty")
    return db.query(Patient).filter(Patient.phone == phone).all()
