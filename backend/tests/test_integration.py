import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

from aarogyaq.api import app
from aarogyaq.database import get_db, Base
from aarogyaq.models import Department

@pytest.fixture(scope="module")
def client(tmp_path_factory):
    # Setup test DB
    db_path = tmp_path_factory.mktemp("db") / "test_integration.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Seed departments
    db = TestingSessionLocal()
    for name in ["Emergency", "General OPD", "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Gynecology", "ENT"]:
        db.add(Department(name=name, status="Available", updated_at=datetime.utcnow()))
    db.commit()
    db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
            db.commit()
        except:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

# Shared state to pass IDs between ordered tests
state = {}

def test_tc_it_01_cardiac_emergency(client):
    payload = {
        "name": "Ramesh Patel",
        "age": 72,
        "gender": "Male",
        "phone": "9876543210",
        "chief_complaint": "severe chest pain and unable to breathe",
        "pain_level": 9,
        "existing_conditions": ["Diabetes", "Hypertension"],
        "use_ai": False
    }
    resp = client.post("/patients/register", json=payload)
    assert resp.status_code == 201, f"Failed: {resp.text}"
    data = resp.json()
    
    assert data["priority_level"] in ["Critical", "High"]
    assert data["queue_type"] == "Emergency"
    assert data["department_assigned"] in ["Emergency", "Cardiology"]
    
    flags = data.get("business_rule_flags", [])
    assert "ELDERLY_CARDIAC_CRITICAL" in flags
    assert isinstance(data.get("summary"), str) and len(data["summary"]) > 0
    assert isinstance(data.get("contributing_factors"), list) and len(data["contributing_factors"]) > 0
    
    state["visit_1_id"] = data["visit_id"]

def test_tc_it_02_general_opd(client):
    payload = {
        "name": "Priya Shah",
        "age": 28,
        "gender": "Female",
        "phone": "9123456789",
        "chief_complaint": "mild sore throat and runny nose for 2 days",
        "pain_level": 2,
        "existing_conditions": [],
        "use_ai": False
    }
    resp = client.post("/patients/register", json=payload)
    assert resp.status_code == 201, f"Failed: {resp.text}"
    data = resp.json()
    
    assert data["priority_level"] in ["Low", "Medium"]
    assert data["queue_type"] == "General"
    
    state["visit_2_id"] = data["visit_id"]
    state["patient_2_id"] = data["patient_id"]

def test_tc_it_03_reassessment(client):
    # 1. Register Priya Shah from TC-IT-02 (Low priority)
    payload_reg = {
        "name": "Priya Shah",
        "age": 28,
        "gender": "Female",
        "phone": "9123456789",
        "chief_complaint": "mild sore throat and runny nose for 2 days",
        "pain_level": 2,
        "existing_conditions": [],
        "use_ai": False
    }
    resp_reg = client.post("/patients/register", json=payload_reg)
    assert resp_reg.status_code == 201
    visit_id = resp_reg.json()["visit_id"]
    patient_id = resp_reg.json()["patient_id"]

    # 2. Re-assess
    payload_re = {
        "chief_complaint": "now having chest pain and difficulty breathing",
        "pain_level": 8,
        "use_ai": False
    }
    resp = client.post(f"/visits/{visit_id}/reassess", json=payload_re)
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()
    
    assert data["priority_level"] in ["Critical", "High"]
    assert data["queue_type"] == "Emergency"
    
    hist_resp = client.get(f"/patients/{patient_id}/history")
    assert hist_resp.status_code == 200
    hist = hist_resp.json()
    
    # Verify is_reassessment is True on the latest assessment
    latest_visit = hist[0]
    assert latest_visit["assessment"]["is_reassessment"] is True

def test_tc_it_04_status_flow(client):
    visit_id = state["visit_1_id"]
    
    # PATCH Attending
    resp = client.patch(f"/visits/{visit_id}/status", json={"status": "Attending", "actor": "doctor"})
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "Attending"
    assert data["attended_at"] is not None

    # PATCH Completed
    resp = client.patch(f"/visits/{visit_id}/status", json={"status": "Completed", "actor": "doctor"})
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "Completed"
    assert data["completed_at"] is not None

def test_tc_it_05_shift_report(client):
    now = datetime.utcnow()
    shift_start = (now - timedelta(minutes=30)).isoformat()
    shift_end = (now + timedelta(minutes=5)).isoformat()
    
    resp = client.get(f"/shift/report?shift_start={shift_start}&shift_end={shift_end}")
    assert resp.status_code == 200, f"Failed: {resp.text}"
    data = resp.json()
    
    assert data["total_patients"] >= 2
    by_pri = data.get("by_priority", {})
    assert by_pri.get("Critical", 0) + by_pri.get("High", 0) >= 1
    assert by_pri.get("Low", 0) >= 1
    assert data["patients_completed"] == 1
