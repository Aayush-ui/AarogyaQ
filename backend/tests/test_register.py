"""
test_register.py — Comprehensive tests for POST /patients/register.

Covers all Phase 7 scenarios:
  1. Successful registration (AI disabled)
  2. Successful registration (AI enabled)
  3. Registration without AI (explicit use_ai=False)
  4. Missing required field — name
  5. Missing required field — chief_complaint
  6. Invalid age (too high)
  7. Invalid age (zero — boundary)
  8. Invalid vitals payload shape (type error)
  9. Invalid gender value
 10. Invalid pain_level (too high / too low)
 11. Field-mapping integrity — existing_conditions vs symptoms are stored correctly
 12. DB persistence end-to-end — Patient + Visit + Assessment all written
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from aarogyaq.api import app
from aarogyaq.database import get_db


# ── Fixture: override DB dependency with isolated in-memory session ───────────

@pytest.fixture(autouse=True)
def override_db(test_db):
    """Redirect FastAPI's get_db dependency to the test session fixture."""
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()


# ── Minimal valid payload helper ──────────────────────────────────────────────

def _base_payload(**overrides) -> dict:
    """Return a valid registration payload, optionally overriding fields."""
    payload = {
        "name": "Test Patient",
        "age": 40,
        "gender": "Male",
        "chief_complaint": "chest pain and difficulty breathing",
        "pain_level": 7,
        "symptoms": ["chest pain", "shortness of breath"],
        "existing_conditions": [],
        "use_ai": False,
    }
    payload.update(overrides)
    return payload


# ── Scenario 1: Successful registration, AI disabled ─────────────────────────

@pytest.mark.asyncio
async def test_register_success_ai_disabled():
    """Valid payload with use_ai=False returns HTTP 201 and a complete response."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload())
    assert res.status_code == 201, res.text
    data = res.json()

    assert "visit_id" in data
    assert "patient_id" in data
    assert data["patient_id"].startswith("ARQ-")
    assert "priority_level" in data
    assert data["priority_level"] in {"Critical", "High", "Medium", "Low"}
    assert "queue_type" in data
    assert data["queue_type"] in {"Emergency", "General"}
    assert "department_assigned" in data
    assert data["department_assigned"] is not None
    assert data["department_assigned"] != ""
    # queue_type must NEVER be the old invalid placeholder
    assert data["queue_type"] != "Unknown", (
        "queue_type 'Unknown' is an invalid placeholder — assign_queue must overwrite it"
    )


# ── Scenario 2: Successful registration, AI enabled ──────────────────────────

@pytest.mark.asyncio
async def test_register_success_ai_enabled():
    """Valid payload with use_ai=True returns HTTP 201."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(use_ai=True))
    assert res.status_code == 201, res.text
    data = res.json()
    assert "priority_level" in data
    assert data["queue_type"] in {"Emergency", "General"}


# ── Scenario 3: Registration with use_ai explicitly False ────────────────────

@pytest.mark.asyncio
async def test_register_success_ai_explicitly_false():
    """Explicit use_ai=False behaves identically to the default."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(use_ai=False))
    assert res.status_code == 201, res.text


# ── Scenario 4: Missing required field — name ─────────────────────────────────

@pytest.mark.asyncio
async def test_register_missing_name():
    """Omitting 'name' must return HTTP 422."""
    payload = _base_payload()
    del payload["name"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=payload)
    assert res.status_code == 422, res.text


# ── Scenario 5: Missing required field — chief_complaint ──────────────────────

@pytest.mark.asyncio
async def test_register_missing_chief_complaint():
    """Omitting 'chief_complaint' must return HTTP 422."""
    payload = _base_payload()
    del payload["chief_complaint"]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=payload)
    assert res.status_code == 422, res.text


# ── Scenario 6: Invalid age — too high ────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_invalid_age_too_high():
    """Age 200 must be rejected with HTTP 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(age=200))
    assert res.status_code == 422, res.text


# ── Scenario 7: Invalid age — zero (boundary) ─────────────────────────────────

@pytest.mark.asyncio
async def test_register_age_zero_boundary():
    """Age 0 passes patient_intake validation (0 <= 0 <= 120 is True)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(age=0))
    # age=0 is valid per patient_intake (allows 0-120)
    assert res.status_code == 201, res.text


# ── Scenario 8: Invalid vitals payload ────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_invalid_vitals_type():
    """Passing a string instead of an object for vitals must return HTTP 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(vitals="bad_value"))
    assert res.status_code == 422, res.text


# ── Scenario 9: Invalid gender ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_invalid_gender():
    """Gender value outside Male/Female/Other must return HTTP 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(gender="Unknown"))
    assert res.status_code == 422, res.text


# ── Scenario 10a: Invalid pain_level — too high ────────────────────────────────

@pytest.mark.asyncio
async def test_register_invalid_pain_level_too_high():
    """pain_level=11 (out of 1-10 range) must return HTTP 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(pain_level=11))
    assert res.status_code == 422, res.text


# ── Scenario 10b: Invalid pain_level — zero ────────────────────────────────────

@pytest.mark.asyncio
async def test_register_invalid_pain_level_zero():
    """pain_level=0 (below minimum of 1) must return HTTP 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(pain_level=0))
    assert res.status_code == 422, res.text


# ── Scenario 11: Field-mapping integrity ────────────────────────────────────

@pytest.mark.asyncio
async def test_register_field_mapping_integrity(test_db):
    """
    Critical regression guard: verifies that:
    - existing_conditions (medical history) is stored in visits.existing_conditions
    - symptoms (current symptoms) are NOT stored in visits.existing_conditions

    This is the exact bug that caused the logged INSERT failure:
      existing_conditions = ["Chest Pain","Abdominal Pain","Dizziness"]
    (symptoms were wrongly stored as existing_conditions)
    """
    import json
    from aarogyaq.models import Visit

    medical_history = ["Diabetes", "Hypertension"]
    current_symptoms = ["chest pain", "dizziness"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(
            existing_conditions=medical_history,
            symptoms=current_symptoms,
        ))
    assert res.status_code == 201, res.text

    visit_id = res.json()["visit_id"]
    visit = test_db.get(Visit, visit_id)
    assert visit is not None

    stored = json.loads(visit.existing_conditions)

    # existing_conditions must hold MEDICAL HISTORY, not symptoms
    assert sorted(stored) == sorted(medical_history), (
        f"Expected medical history {medical_history!r} in existing_conditions, "
        f"but got {stored!r}. This is the field-mapping bug."
    )

    # Symptoms must NOT appear in existing_conditions
    for sym in current_symptoms:
        assert sym not in stored, (
            f"Symptom {sym!r} was wrongly stored in existing_conditions — "
            f"Bug 1 regression detected."
        )


# ── Scenario 12: DB persistence end-to-end ───────────────────────────────────

@pytest.mark.asyncio
async def test_register_db_persistence(test_db):
    """After a successful registration, Patient, Visit, and Assessment all exist in DB."""
    from aarogyaq.models import Visit, Patient

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/patients/register", json=_base_payload(
            name="Ravi Kumar",
            age=55,
            gender="Male",
            existing_conditions=["Diabetes"],
        ))
    assert res.status_code == 201, res.text

    data = res.json()
    patient_id = data["patient_id"]
    visit_id = data["visit_id"]

    # Patient row
    patient = test_db.get(Patient, patient_id)
    assert patient is not None
    assert patient.name == "Ravi Kumar"
    assert patient.age == 55

    # Visit row
    visit = test_db.get(Visit, visit_id)
    assert visit is not None
    assert visit.patient_id == patient_id
    assert visit.queue_type in {"Emergency", "General"}
    assert visit.department_assigned is not None
    assert visit.status == "Waiting"

    # Assessment row (created by orchestrator)
    assert len(visit.assessments) == 1
    assert visit.assessments[0].priority_level in {"Critical", "High", "Medium", "Low"}
