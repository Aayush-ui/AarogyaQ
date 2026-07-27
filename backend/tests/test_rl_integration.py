import pytest
import json
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta
from aarogyaq.api import app
from aarogyaq.models import Visit, Patient
from aarogyaq.rl_agent import RLAgentState, load_agent

@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_rl_triage_under_offsets():
    # Mock RLAgentState with an offset of +10 for Emergency
    # Critical: (86, 100), High: (61, 85)
    mocked_agent = RLAgentState(
        version=1,
        epsilon=0.0,
        episodes=10,
        qtable={},
        threshold_offsets={"Emergency": 10, "General": 10}
    )
    
    with patch("aarogyaq.rl_agent.load_agent", return_value=mocked_agent):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Register a patient with a combination that yields risk score of 60:
            # headache (head_injury: 25) + vomiting & dry mouth (dehydration: 10) + pain_level 8 (15) + risk modifier (10) = 60.
            res = await ac.post("/patients/register", json={
                "name": "Offset Test Patient",
                "age": 30,
                "gender": "Male",
                "chief_complaint": "headache, vomiting, dry mouth",
                "pain_level": 8,
                "symptoms": ["headache", "vomiting", "dry mouth"],
                "existing_conditions": []
            })
            assert res.status_code == 201
            data = res.json()
            # Under standard thresholds (no offset), 60 maps to "High" (51-75)
            # Under +10 offset thresholds, 60 maps to "Medium" (36-60)
            assert data["priority_level"] == "Medium"
            assert data["risk_score"] == 60.0

@pytest.mark.asyncio
async def test_auto_rl_feedback_on_completed():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Register patient
        reg_res = await ac.post("/patients/register", json={
            "name": "Jane Feedback",
            "age": 28,
            "gender": "Female",
            "chief_complaint": "minor sprain",
            "pain_level": 3,
            "symptoms": [],
            "existing_conditions": []
        })
        assert reg_res.status_code == 201
        data = reg_res.json()
        visit_id = data["visit_id"]
        
        # Transition to Attending
        res_patch = await ac.patch(f"/visits/{visit_id}/status", json={
            "status": "Attending",
            "actor": "nurse"
        })
        assert res_patch.status_code == 200
        
        # Capture current agent episodes count before complete
        agent_before = load_agent()
        episodes_before = agent_before.episodes
        
        # Transition to Completed
        res_complete = await ac.patch(f"/visits/{visit_id}/status", json={
            "status": "Completed",
            "actor": "doctor"
        })
        assert res_complete.status_code == 200
        
        # Verify agent has updated Q-table (more episodes)
        agent_after = load_agent()
        assert agent_after.episodes == episodes_before + 1
