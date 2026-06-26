import pytest
from httpx import AsyncClient, ASGITransport
from aarogyaq.api import app
from datetime import datetime, timedelta

@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "db": "connected"}

@pytest.mark.asyncio
async def test_register_patient_valid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json={
            "name": "John Doe",
            "age": 35,
            "gender": "Male",
            "chief_complaint": "chest pain, difficulty breathing",
            "pain_level": 8,
            "existing_conditions": []
        })
    assert res.status_code == 201
    data = res.json()
    assert "priority_level" in data
    assert data["priority_level"] in ["Critical", "High"]

@pytest.mark.asyncio
async def test_register_patient_invalid_age():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json={
            "name": "Jane Doe",
            "age": 200,
            "gender": "Female",
            "chief_complaint": "headache",
            "pain_level": 5,
            "existing_conditions": []
        })
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_get_emergency_queue():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        await ac.post("/patients/register", json={
            "name": "Critical Patient",
            "age": 60,
            "gender": "Male",
            "chief_complaint": "chest pain, difficulty breathing",
            "pain_level": 9,
            "existing_conditions": []
        })
        res = await ac.get("/queue/emergency")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "assessment_id" in data[0]

@pytest.mark.asyncio
async def test_patch_visit_status(test_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_reg = await ac.post("/patients/register", json={
            "name": "Wait Patient",
            "age": 45,
            "gender": "Female",
            "chief_complaint": "headache",
            "pain_level": 5,
            "existing_conditions": []
        })
        assert res_reg.status_code == 201
        visit_id = res_reg.json()["visit_id"]
        
        res_patch = await ac.patch(f"/visits/{visit_id}/status", json={
            "status": "Attending",
            "actor": "nurse"
        })
    assert res_patch.status_code == 200
    assert res_patch.json()["attended_at"] is not None

@pytest.mark.asyncio
async def test_shift_report():
    s = (datetime.utcnow() - timedelta(hours=1)).isoformat()
    e = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get(f"/shift/report?shift_start={s}&shift_end={e}")
    assert res.status_code == 200
    data = res.json()
    assert "total_patients" in data
