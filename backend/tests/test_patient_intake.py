"""Tests for aarogyaq.patient_intake — patient registration and lookup."""
from __future__ import annotations

import pytest

from aarogyaq.patient_intake import (
    find_patients_by_phone,
    generate_patient_id,
    get_patient,
    register_patient,
)


from aarogyaq.models import PatientCreate, Patient, AuditLog

def test_register_patient_valid_case(test_db):
    """Valid registration: assert patient_id format ARQ-000001, visit.status == 'Waiting'"""
    patient, visit = register_patient(
        test_db, "John", 30, "Male", "123", "Pain", 5, 10, []
    )
    assert patient.patient_id == "ARQ-000001"
    assert visit.status == "Waiting"

def test_register_patient_invalid_age(test_db):
    """Invalid age (200): assert ValueError raised"""
    with pytest.raises(ValueError, match="Age must be between 0 and 120"):
        register_patient(
            test_db, "John", 200, "Male", "123", "Pain", 5, 10, []
        )

def test_register_patient_invalid_pain_level(test_db):
    """Invalid pain_level (0): assert ValueError raised"""
    with pytest.raises(ValueError, match="Pain level must be between 1 and 10"):
        register_patient(
            test_db, "John", 30, "Male", "123", "Pain", 0, 10, []
        )

def test_register_patient_empty_complaint(test_db):
    """Empty chief_complaint: assert ValueError raised"""
    with pytest.raises(ValueError, match="Chief complaint must not be empty"):
        register_patient(
            test_db, "John", 30, "Male", "123", "   ", 5, 10, []
        )

def test_register_patient_reused_phone(test_db):
    """Second registration with same phone: assert same patient_id reused, new visit created"""
    patient1, visit1 = register_patient(
        test_db, "John", 30, "Male", "12345", "Pain", 5, 10, []
    )
    patient2, visit2 = register_patient(
        test_db, "John", 30, "Male", "12345", "Fever", 2, 20, []
    )
    assert patient1.patient_id == patient2.patient_id
    assert visit1.visit_id != visit2.visit_id
    assert test_db.query(Patient).count() == 1

def test_register_patient_audit_log(test_db):
    """AuditLog entry exists after registration"""
    patient, visit = register_patient(
        test_db, "John", 30, "Male", "123", "Pain", 5, 10, []
    )
    log = test_db.query(AuditLog).filter(AuditLog.visit_id == visit.visit_id).first()
    assert log is not None
    assert log.actor == "nurse"
    assert log.action == "REGISTERED"
