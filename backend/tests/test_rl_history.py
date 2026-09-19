"""
Tests for RL Agent reward history tracking and GET /rl/history endpoint (R-RL-02).
"""
import pytest
from httpx import AsyncClient, ASGITransport
from aarogyaq.api import app
from aarogyaq.rl_agent import load_agent, save_agent, update_qtable, RLAgentState


@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()


def test_rl_reward_history_dataclass_and_capping():
    """Verify that update_qtable appends to reward_history and caps at 500 entries."""
    agent = RLAgentState()
    assert agent.reward_history == []

    # Apply 10 updates
    for i in range(10):
        update_qtable(agent, "Emergency|morning|low", 1, 0.75)

    assert len(agent.reward_history) == 10
    assert agent.reward_history[0]["reward"] == 0.75
    assert agent.reward_history[0]["episode"] == 1
    assert "epsilon" in agent.reward_history[0]
    assert agent.reward_history[-1]["episode"] == 10

    # Test capping at 500
    for i in range(550):
        update_qtable(agent, "General|night|high", 2, 0.5)

    assert len(agent.reward_history) == 500
    assert agent.reward_history[-1]["episode"] == 560


@pytest.mark.asyncio
async def test_get_rl_history_endpoint():
    """Verify GET /rl/history returns structured history and reward arrays."""
    # Seed some updates into agent
    agent = load_agent()
    update_qtable(agent, "Emergency|afternoon|medium", 0, 1.0)
    update_qtable(agent, "Emergency|afternoon|medium", 3, -0.5)
    save_agent(agent)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/rl/history")

    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    assert "rewards" in data
    assert "count" in data
    assert data["count"] >= 2
    assert len(data["rewards"]) == data["count"]
    assert data["rewards"][-2] == 1.0
    assert data["rewards"][-1] == -0.5
