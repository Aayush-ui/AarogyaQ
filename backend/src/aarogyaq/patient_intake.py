"""
Single responsibility: patient registration and lookup.

Handles generating ``ARQ-NNNNNN`` patient IDs, persisting new patients, and
retrieving patients by ID or phone number.  All database writes emit an audit
event via :mod:`aarogyaq.audit`.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from aarogyaq.models import Patient, PatientCreate


def generate_patient_id(db: Session) -> str:
    """Generate the next ``ARQ-NNNNNN`` patient ID.

    Derives the sequence counter from the current row count of the ``patients``
    table.

    Args:
        db: Active database session.

    Returns:
        A unique patient ID string such as ``"ARQ-000001"``.
    """
    count = db.query(Patient).count()
    return f"ARQ-{count + 1:06d}"


def register_patient(db: Session, data: PatientCreate) -> Patient:
    """Persist a new patient record and return the ORM instance.

    Args:
        db: Active database session.
        data: Validated patient creation input.

    Returns:
        The newly persisted :class:`Patient` ORM instance.

    Raises:
        ValueError: if *data* contains values that violate business constraints.
    """
    patient_id = generate_patient_id(db)
    patient = Patient(
        patient_id=patient_id,
        name=data.name,
        age=data.age,
        gender=data.gender,
        phone=data.phone,
    )
    db.add(patient)
    db.flush()
    return patient


def get_patient(db: Session, patient_id: str) -> Patient:
    """Retrieve a patient by their ``ARQ-NNNNNN`` ID.

    Args:
        db: Active database session.
        patient_id: The ``ARQ-NNNNNN`` patient identifier.

    Returns:
        The matching :class:`Patient` ORM instance.

    Raises:
        KeyError: if no patient with the given ID exists.
    """
    patient = db.get(Patient, patient_id)
    if not patient:
        raise KeyError(f"Patient with ID {patient_id} not found")
    return patient


def find_patients_by_phone(db: Session, phone: str) -> list[Patient]:
    """Search for all patients registered with a given phone number.

    Args:
        db: Active database session.
        phone: Phone number string to search for (exact match).

    Returns:
        A (possibly empty) list of matching :class:`Patient` instances.

    Raises:
        ValueError: if *phone* is an empty string.
    """
    if not phone:
        raise ValueError("Phone number cannot be empty")
    return db.query(Patient).filter(Patient.phone == phone).all()
