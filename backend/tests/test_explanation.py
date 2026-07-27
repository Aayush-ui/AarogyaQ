import pytest
import json
from httpx import AsyncClient, ASGITransport
from datetime import datetime
from aarogyaq.api import app
from aarogyaq.models import Visit, Patient
from aarogyaq.summary_gen import generate_summary, BUSINESS_FLAG_EXPLANATIONS

@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_explanation_endpoint_success():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register a patient with pain level 10 to trigger MAX_PAIN_OVERRIDE
        reg_res = await ac.post("/patients/register", json={
            "name": "Jane Pain",
            "age": 30,
            "gender": "Female",
            "chief_complaint": "severe migraine",
            "pain_level": 10,
            "existing_conditions": []
        })
        assert reg_res.status_code == 201
        visit_id = reg_res.json()["visit_id"]

        # Request explanation
        res = await ac.get(f"/visits/{visit_id}/explanation")
        assert res.status_code == 200
        
        data = res.json()
        assert "rule_breakdown" in data
        assert "business_overrides" in data
        assert "twin_alert_reasons" in data
        assert "rl_threshold_at_time" in data
        
        # Verify the MAX_PAIN_OVERRIDE flag was captured and explained
        overrides = data["business_overrides"]
        assert len(overrides) > 0
        assert overrides[0]["flag"] == "MAX_PAIN_OVERRIDE"
        assert overrides[0]["explanation"] == BUSINESS_FLAG_EXPLANATIONS["MAX_PAIN_OVERRIDE"]
        
        # Verify RL thresholds structure
        thresholds = data["rl_threshold_at_time"]
        for level in ["Critical", "High", "Medium", "Low"]:
            assert level in thresholds
            assert len(thresholds[level]) == 2
            assert isinstance(thresholds[level][0], (int, float))
            assert isinstance(thresholds[level][1], (int, float))

@pytest.mark.asyncio
async def test_explanation_endpoint_missing_visit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/visits/99999/explanation")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"]

@pytest.mark.asyncio
async def test_explanation_endpoint_no_assessment(test_db):
    # Manually create patient and visit without assessment
    p = Patient(patient_id="PAT-999", name="No Assess", age=25, gender="Male")
    test_db.add(p)
    test_db.flush()
    
    v = Visit(
        patient_id="PAT-999",
        chief_complaint="nothing",
        pain_level=1,
        existing_conditions=json.dumps([]),
        queue_type="General",
        status="Waiting",
        visit_timestamp=datetime.utcnow()
    )
    test_db.add(v)
    test_db.flush()
    visit_id = v.visit_id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/visits/{visit_id}/explanation")
        assert res.status_code == 422
        assert "No assessments found" in res.json()["detail"]

def test_summary_incorporates_business_overrides():
    summary = generate_summary(
        patient_name="Alex",
        age=75,
        gender="Male",
        chief_complaint="Chest pain",
        mapped_symptoms=["chest_pain"],
        pain_level=8,
        existing_conditions=[],
        priority_level="Critical",
        contributing_factors=["cardiac risk"],
        department_assigned="Cardiology",
        use_ai=False,
        business_flags=["ELDERLY_CARDIAC_CRITICAL"]
    )
    assert "BUSINESS OVERRIDES:" in summary
    assert BUSINESS_FLAG_EXPLANATIONS["ELDERLY_CARDIAC_CRITICAL"] in summary
