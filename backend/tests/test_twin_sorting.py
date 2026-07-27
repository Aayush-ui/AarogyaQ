import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from aarogyaq.models import Visit, Patient, Vitals
from aarogyaq.patient_intake import register_patient
from aarogyaq.orchestrator import assess_patient
from aarogyaq.queue_manager import get_general_queue

@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    from aarogyaq.api import app
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()

def test_twin_sorting_escalation(test_db: Session):
    # 1. Register Patient A (Medium priority, earlier arrival, lower initial score)
    # Chief complaint: dry mouth, vomiting. pain_level = 4.
    p_a, v_a = register_patient(
        test_db,
        name="Patient A",
        age=30,
        gender="Male",
        phone="1111111111",
        chief_complaint="vomiting, dry mouth",
        pain_level=4,
        symptom_duration=1,
        existing_conditions=[]
    )
    # Perform initial triage (will yield Low priority, score 10)
    res_a = assess_patient(test_db, v_a.visit_id)
    assert res_a["priority_level"] == "Low"
    assert res_a["risk_score"] == 10.0
    
    # 2. Register Patient B (Low priority, later arrival, higher initial score)
    # Chief complaint: headache. pain_level = 5.
    p_b, v_b = register_patient(
        test_db,
        name="Patient B",
        age=30,
        gender="Female",
        phone="2222222222",
        chief_complaint="headache",
        pain_level=5,
        symptom_duration=1,
        existing_conditions=[]
    )
    # Perform initial triage (will yield Low priority, score 25)
    res_b = assess_patient(test_db, v_b.visit_id)
    assert res_b["priority_level"] == "Low"
    assert res_b["risk_score"] == 25.0

    # Ensure both are in the general queue
    assert v_a.queue_type == "General"
    assert v_b.queue_type == "General"

    # By default, general queue sorting should have Patient B (score 25) ahead of Patient A (score 10)
    q1 = get_general_queue(test_db)
    assert len(q1) >= 2
    
    # Find positions of Patient A and Patient B in the returned queue list
    ids = [v.visit_id for v in q1]
    idx_a = ids.index(v_a.visit_id)
    idx_b = ids.index(v_b.visit_id)
    assert idx_b < idx_a  # Patient B is sorted ahead of Patient A

    # 3. Simulate deterioration for Patient A:
    # Set backdated timestamp (e.g. arrived 35 minutes ago)
    # And set abnormal vitals (hypoxia: SpO2 = 88)
    v_a.visit_timestamp = datetime.utcnow() - timedelta(minutes=35)
    
    # Add vitals
    vitals_a = Vitals(
        visit_id=v_a.visit_id,
        heart_rate=110,
        systolic_bp=120,
        diastolic_bp=80,
        spo2=88, # SpO2 < 94 adds +2.0 deterioration rate
        temperature=37.0
    )
    v_a.vitals = vitals_a
    test_db.add(vitals_a)
    test_db.flush()
    test_db.refresh(v_a)

    # Re-fetch general queue
    q2 = get_general_queue(test_db)
    ids_after = [v.visit_id for v in q2]
    
    idx_a_after = ids_after.index(v_a.visit_id)
    idx_b_after = ids_after.index(v_b.visit_id)
    
    # Now, Patient A should have been escalated by the Digital Twin
    # (alert_level should be CRITICAL_ALERT or DETIORATING and twin_priority should be Critical/High)
    # Verify that Patient A is now sorted AHEAD of Patient B!
    assert idx_a_after < idx_b_after
