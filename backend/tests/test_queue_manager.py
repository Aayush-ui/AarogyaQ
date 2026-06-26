import pytest
from datetime import datetime, timedelta
from aarogyaq.models import Patient, Visit, Assessment
from aarogyaq.queue_manager import (
    assign_queue,
    get_emergency_queue,
    get_general_queue,
    get_stale_patients,
    update_visit_status,
)

@pytest.fixture
def clean_db(test_db):
    # clear existing data
    test_db.query(Assessment).delete()
    test_db.query(Visit).delete()
    test_db.query(Patient).delete()
    test_db.commit()
    return test_db

def test_queues_routing(clean_db):
    # Register 2 patients: one Critical, one Low
    p1 = Patient(patient_id="ARQ-01", name="C", age=20, gender="Male")
    p2 = Patient(patient_id="ARQ-02", name="L", age=20, gender="Male")
    clean_db.add_all([p1, p2])
    clean_db.flush()
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Chest pain", pain_level=10, queue_type="Emergency", status="Waiting", visit_timestamp=datetime.utcnow())
    v2 = Visit(patient_id="ARQ-02", chief_complaint="Headache", pain_level=2, queue_type="General", status="Waiting", visit_timestamp=datetime.utcnow())
    clean_db.add_all([v1, v2])
    clean_db.flush()
    
    a1 = Assessment(visit_id=v1.visit_id, raw_symptoms="test", mapped_symptoms="[]", confidence_scores="{}", priority_level="Critical", risk_score=90, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    a2 = Assessment(visit_id=v2.visit_id, raw_symptoms="test", mapped_symptoms="[]", confidence_scores="{}", priority_level="Low", risk_score=10, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    clean_db.add_all([a1, a2])
    clean_db.flush()
    
    eq = get_emergency_queue(clean_db)
    gq = get_general_queue(clean_db)
    
    assert len(eq) == 1
    assert eq[0].visit_id == v1.visit_id
    
    assert len(gq) == 1
    assert gq[0].visit_id == v2.visit_id

def test_fifo_ordering(clean_db):
    # Two Critical patients registered 1 min apart
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    p2 = Patient(patient_id="ARQ-02", name="B", age=20, gender="Male")
    clean_db.add_all([p1, p2])
    clean_db.flush()
    
    t1 = datetime.utcnow() - timedelta(minutes=2)
    t2 = datetime.utcnow() - timedelta(minutes=1)
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=10, queue_type="Emergency", status="Waiting", visit_timestamp=t1)
    v2 = Visit(patient_id="ARQ-02", chief_complaint="Pain", pain_level=10, queue_type="Emergency", status="Waiting", visit_timestamp=t2)
    clean_db.add_all([v1, v2])
    clean_db.flush()
    
    a1 = Assessment(visit_id=v1.visit_id, raw_symptoms="test", mapped_symptoms="[]", confidence_scores="{}", priority_level="Critical", risk_score=90, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    a2 = Assessment(visit_id=v2.visit_id, raw_symptoms="test", mapped_symptoms="[]", confidence_scores="{}", priority_level="Critical", risk_score=90, score_breakdown="[]", contributing_factors="[]", business_rule_flags="[]", is_reassessment=False)
    clean_db.add_all([a1, a2])
    clean_db.flush()
    
    # Even if inserted v1 then v2, verify sorting logic correctly outputs earlier arrival first
    eq = get_emergency_queue(clean_db)
    assert len(eq) == 2
    assert eq[0].visit_id == v1.visit_id
    assert eq[1].visit_id == v2.visit_id

def test_get_stale_patients(clean_db):
    # Aging: register a Low patient, monkey-patch visit_timestamp to 46 minutes ago
    p1 = Patient(patient_id="ARQ-01", name="Old", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    t1 = datetime.utcnow() - timedelta(minutes=46)
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=2, queue_type="General", status="Waiting", visit_timestamp=t1)
    clean_db.add(v1)
    clean_db.flush()
    
    stale = get_stale_patients(clean_db)
    assert len(stale) == 1
    assert stale[0].visit_id == v1.visit_id

def test_update_visit_status_attending(clean_db):
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=2, queue_type="General", status="Waiting", visit_timestamp=datetime.utcnow())
    clean_db.add(v1)
    clean_db.flush()
    
    # update_visit_status to "Attending": assert attended_at is set, status == "Attending"
    v = update_visit_status(clean_db, v1.visit_id, "Attending", "doctor")
    assert v.status == "Attending"
    assert v.attended_at is not None

def test_update_visit_status_completed(clean_db):
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=2, queue_type="General", status="Attending", visit_timestamp=datetime.utcnow())
    clean_db.add(v1)
    clean_db.flush()
    
    # update_visit_status to "Completed": assert completed_at set
    v = update_visit_status(clean_db, v1.visit_id, "Completed", "doctor")
    assert v.status == "Completed"
    assert v.completed_at is not None

def test_update_visit_status_invalid(clean_db):
    p1 = Patient(patient_id="ARQ-01", name="A", age=20, gender="Male")
    clean_db.add(p1)
    clean_db.flush()
    
    v1 = Visit(patient_id="ARQ-01", chief_complaint="Pain", pain_level=2, queue_type="General", status="Waiting", visit_timestamp=datetime.utcnow())
    clean_db.add(v1)
    clean_db.flush()
    
    # update_visit_status with invalid status: ValueError raised
    with pytest.raises(ValueError):
        update_visit_status(clean_db, v1.visit_id, "InvalidStatus", "doctor")
