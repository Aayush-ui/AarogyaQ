import pytest
from datetime import datetime, timedelta
from aarogyaq.models import Visit, Patient, Assessment, AuditLog
from aarogyaq.shift_report import generate_shift_report

@pytest.fixture
def clean_db(test_db):
    test_db.query(AuditLog).delete()
    test_db.query(Assessment).delete()
    test_db.query(Visit).delete()
    test_db.query(Patient).delete()
    test_db.commit()
    return test_db

def test_shift_empty(clean_db):
    start = datetime.utcnow() - timedelta(hours=1)
    end = datetime.utcnow()
    report = generate_shift_report(clean_db, start, end)
    
    assert report["total_patients"] == 0
    assert report["avg_wait_time_minutes"] is None
    assert report["longest_wait_minutes"] is None

def test_shift_priority_counts(clean_db):
    # 2 Critical + 1 Low registered
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    p2 = Patient(patient_id="ARQ-02", name="B", age=20, gender="Male")
    p3 = Patient(patient_id="ARQ-03", name="C", age=20, gender="Male")
    clean_db.add_all([p1, p2, p3])
    clean_db.flush()
    
    t = datetime.utcnow()
    v1 = Visit(patient_id="ARQ-01", chief_complaint="A", pain_level=1, queue_type="Emergency", status="Waiting", visit_timestamp=t)
    v2 = Visit(patient_id="ARQ-02", chief_complaint="B", pain_level=1, queue_type="Emergency", status="Waiting", visit_timestamp=t)
    v3 = Visit(patient_id="ARQ-03", chief_complaint="C", pain_level=1, queue_type="General", status="Waiting", visit_timestamp=t)
    clean_db.add_all([v1, v2, v3])
    clean_db.flush()
    
    a1 = Assessment(visit_id=v1.visit_id, raw_symptoms="", mapped_symptoms="[]", confidence_scores="{}", priority_level="Critical", risk_score=90, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    a2 = Assessment(visit_id=v2.visit_id, raw_symptoms="", mapped_symptoms="[]", confidence_scores="{}", priority_level="Critical", risk_score=90, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    a3 = Assessment(visit_id=v3.visit_id, raw_symptoms="", mapped_symptoms="[]", confidence_scores="{}", priority_level="Low", risk_score=10, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    clean_db.add_all([a1, a2, a3])
    clean_db.flush()
    
    report = generate_shift_report(clean_db, t - timedelta(minutes=5), t + timedelta(minutes=5))
    
    assert report["total_patients"] == 3
    assert report["by_priority"]["Critical"] == 2
    assert report["by_priority"]["Low"] == 1
    assert report["by_priority"]["High"] == 0
    assert report["by_priority"]["Medium"] == 0

def test_shift_wait_time(clean_db):
    # One completed visit (attended 20min after registration)
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    t = datetime.utcnow()
    v1 = Visit(
        patient_id="ARQ-01", 
        chief_complaint="A", 
        pain_level=1, 
        queue_type="Emergency", 
        status="Completed", 
        visit_timestamp=t,
        attended_at=t + timedelta(minutes=20),
        completed_at=t + timedelta(minutes=30)
    )
    clean_db.add(v1)
    clean_db.flush()
    
    report = generate_shift_report(clean_db, t - timedelta(minutes=5), t + timedelta(minutes=60))
    
    assert report["patients_completed"] == 1
    assert report["avg_wait_time_minutes"] == 20.0
    assert report["longest_wait_minutes"] == 20.0
