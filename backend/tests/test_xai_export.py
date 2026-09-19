"""
Tests for XAI Dossier Export endpoint GET /visits/{visit_id}/export (R-XAI-04).
"""
import json
import pytest
from httpx import AsyncClient, ASGITransport
from aarogyaq.api import app


@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_xai_export_not_found():
    """Verify 404 is returned for non-existent visit."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/visits/999999/export")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_xai_export_success():
    """Verify exporting valid patient visit produces complete downloadable JSON dossier."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register a patient to generate full assessment and twin state
        reg_res = await ac.post("/patients/register", json={
            "name": "Arjun Sharma",
            "age": 52,
            "gender": "Male",
            "chief_complaint": "Severe retrosternal crushing chest pain, radiating to left jaw",
            "pain_level": 9,
            "existing_conditions": ["Hypertension", "Coronary Artery Disease"],
            "vitals": {
                "heart_rate": 115,
                "systolic_bp": 175,
                "diastolic_bp": 105,
                "respiratory_rate": 24,
                "spo2": 93,
                "temperature": 37.2,
            },
            "use_ai": False
        })
        assert reg_res.status_code == 201
        visit_id = reg_res.json()["visit"]["visit_id"]

        # Call export endpoint
        res = await ac.get(f"/visits/{visit_id}/export")

    assert res.status_code == 200
    assert "application/json" in res.headers.get("content-type", "")
    assert "attachment" in res.headers.get("content-disposition", "")
    assert f"aarogyaq_xai_visit_{visit_id}" in res.headers.get("content-disposition", "")

    # Parse and validate exported payload structure
    dossier = res.json()
    assert "export_metadata" in dossier
    assert dossier["export_metadata"]["system"] == "AarogyaQ CDSS & Dynamic Triage"

    assert "patient" in dossier
    assert dossier["patient"]["name"] == "Arjun Sharma"

    assert "visit" in dossier
    assert dossier["visit"]["visit_id"] == visit_id

    assert "assessment" in dossier
    assert dossier["assessment"]["priority_level"] in ["Critical", "High", "Medium", "Low"]

    assert "digital_twin" in dossier
    assert "xai_explanation" in dossier
    xai = dossier["xai_explanation"]
    assert "rule_breakdown" in xai
    assert "business_overrides" in xai
    assert "twin_alert_reasons" in xai
    assert "rl_threshold_at_time" in xai
