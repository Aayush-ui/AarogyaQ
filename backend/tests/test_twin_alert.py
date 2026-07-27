import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from aarogyaq.models import Visit, AuditLog
from aarogyaq.patient_intake import register_patient
from aarogyaq.orchestrator import assess_patient

@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    from aarogyaq.api import app
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()

def test_trigger_twin_alert_success(test_db: Session):
    from aarogyaq.api import app
    client = TestClient(app)
    
    # 1. Register and triage patient
    p, v = register_patient(
        test_db,
        name="Test Patient",
        age=35,
        gender="Male",
        phone="5555555555",
        chief_complaint="abdominal pain",
        pain_level=6,
        symptom_duration=2,
        existing_conditions=[]
    )
    assess_patient(test_db, v.visit_id)
    
    # Check default is False
    assert v.needs_reassessment is False
    
    # 2. Trigger the twin alert
    response = client.post(f"/visits/{v.visit_id}/twin/alert")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "alert_triggered"
    assert res_data["needs_reassessment"] is True
    
    # Verify DB flag is True
    test_db.refresh(v)
    assert v.needs_reassessment is True
    
    # Verify Audit log entry is created
    logs = test_db.query(AuditLog).filter(
        AuditLog.visit_id == v.visit_id,
        AuditLog.action == "TWIN_ALERT_TRIGGERED"
    ).all()
    assert len(logs) == 1
    assert "reassessment" in logs[0].notes

def test_clear_twin_alert_on_reassessment(test_db: Session):
    from aarogyaq.api import app
    client = TestClient(app)
    
    # 1. Register, triage, and flag patient
    p, v = register_patient(
        test_db,
        name="Test Patient",
        age=35,
        gender="Male",
        phone="5555555555",
        chief_complaint="abdominal pain",
        pain_level=6,
        symptom_duration=2,
        existing_conditions=[]
    )
    assess_patient(test_db, v.visit_id)
    
    client.post(f"/visits/{v.visit_id}/twin/alert")
    test_db.refresh(v)
    assert v.needs_reassessment is True
    
    # 2. Reassess patient
    reassess_response = client.post(
        f"/visits/{v.visit_id}/reassess",
        json={
            "chief_complaint": "worse abdominal pain",
            "pain_level": 8,
            "use_ai": False
        }
    )
    assert reassess_response.status_code == 200
    
    # Verify DB flag is reset to False
    test_db.refresh(v)
    assert v.needs_reassessment is False

def test_trigger_twin_alert_not_found(test_db: Session):
    from aarogyaq.api import app
    client = TestClient(app)
    
    response = client.post("/visits/99999/twin/alert")
    assert response.status_code == 404
    assert "Visit 99999 not found" in response.json()["detail"]
