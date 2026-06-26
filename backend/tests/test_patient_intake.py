"""Tests for aarogyaq.patient_intake — patient registration and lookup."""
from __future__ import annotations

import pytest

from aarogyaq.patient_intake import (
    find_patients_by_phone,
    generate_patient_id,
    get_patient,
    register_patient,
)


from aarogyaq.models import PatientCreate, Patient

def test_register_patient_valid_case(test_db):
    """Registering a patient with valid data returns an ARQ-format ID."""
    data = PatientCreate(name="John Doe", age=30, gender="Male", phone="1234567890")
    patient = register_patient(test_db, data)
    assert patient.patient_id.startswith("ARQ-")
    assert patient.name == "John Doe"
    assert test_db.query(Patient).count() == 1


def test_get_patient_missing_raises_keyerror_invalid_case(test_db):
    """get_patient raises KeyError when the ID does not exist."""
    with pytest.raises(KeyError):
        get_patient(test_db, "ARQ-999")


def test_find_patients_by_phone_partial_match_edge(test_db):
    """find_patients_by_phone returns a list of matching PatientOut objects."""
    p1 = PatientCreate(name="John", age=30, gender="Male", phone="12345")
    p2 = PatientCreate(name="Jane", age=30, gender="Female", phone="12345")
    register_patient(test_db, p1)
    register_patient(test_db, p2)
    
    matches = find_patients_by_phone(test_db, "12345")
    assert len(matches) == 2


def test_generate_patient_id_sequential_edge(test_db):
    """generate_patient_id() returns sequential zero-padded ARQ IDs."""
    id1 = generate_patient_id(test_db)
    assert id1 == "ARQ-000001"
    
    # insert a patient to increment count
    data = PatientCreate(name="Jane", age=25, gender="Female")
    register_patient(test_db, data)
    
    id2 = generate_patient_id(test_db)
    assert id2 == "ARQ-000002"

def test_find_patients_by_phone(test_db):
    data = PatientCreate(name="Jane", age=25, gender="Female", phone="555-1234")
    register_patient(test_db, data)
    
    patients = find_patients_by_phone(test_db, "555-1234")
    assert len(patients) == 1
    assert patients[0].name == "Jane"
    
    with pytest.raises(ValueError):
        find_patients_by_phone(test_db, "")
