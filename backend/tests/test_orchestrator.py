import pytest
from aarogyaq.orchestrator import assess_patient, reassess_patient
from aarogyaq.patient_intake import register_patient
from aarogyaq.models import Assessment, AuditLog, DoctorSummary, Visit

@pytest.fixture
def clean_db(test_db):
    test_db.query(AuditLog).delete()
    test_db.query(DoctorSummary).delete()
    test_db.query(Assessment).delete()
    test_db.query(Visit).delete()
    test_db.commit()
    return test_db

def test_assess_critical(clean_db):
    # Register a patient (chest_pain description), call assess_patient():
    # assert priority is "Critical" or "High", department is "Emergency" or "Cardiology", summary is non-empty string.
    p, v = register_patient(clean_db, "John", 40, "Male", None, "chest pain, difficulty breathing", 8, None, [])
    
    res = assess_patient(clean_db, v.visit_id)
    
    assert res["priority_level"] in ["Critical", "High"]
    assert res["department_assigned"] in ["Emergency", "Cardiology"]
    assert res["summary"]
    assert isinstance(res["summary"], str)

def test_assess_low(clean_db):
    # Register a low-acuity patient (mild headache), call assess_patient():
    # assert priority is "Low" or "Medium", queue is "General".
    p, v = register_patient(clean_db, "Jane", 20, "Female", None, "mild headache", 2, None, [])
    
    res = assess_patient(clean_db, v.visit_id)
    
    assert res["priority_level"] in ["Low", "Medium"]
    assert res["queue_type"] == "General"

def test_reassess_patient(clean_db):
    # Call reassess_patient() upgrading pain level from 3 to 10:
    # assert new assessment has is_reassessment=True, priority re-evaluated.
    p, v = register_patient(clean_db, "Bob", 30, "Male", None, "knee pain", 3, None, [])
    
    res1 = assess_patient(clean_db, v.visit_id)
    
    res2 = reassess_patient(clean_db, v.visit_id, "knee pain worse", 10)
    
    # Verify new assessment is_reassessment = True
    assessments = clean_db.query(Assessment).filter(Assessment.visit_id == v.visit_id).all()
    assert len(assessments) == 2
    latest = max(assessments, key=lambda a: a.assessment_id)
    assert latest.is_reassessment is True

def test_assess_invalid_visit(clean_db):
    # Call assess_patient() with non-existent visit_id: ValueError raised.
    with pytest.raises(ValueError):
        assess_patient(clean_db, 99999)
