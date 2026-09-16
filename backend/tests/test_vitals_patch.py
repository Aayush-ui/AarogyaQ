"""
test_vitals_patch.py — Comprehensive tests for PATCH /visits/{visit_id}/vitals (R-DYN-04).

Covers:
  1. Patch vitals when vitals already exist (updates values & timestamp).
  2. Patch vitals when no vitals previously existed (creates new Vitals row).
  3. Verification that re-assessment is triggered (is_reassessment=True) and audit log written.
  4. Dynamic Twin projection update (e.g. SpO2 < 94% adds hypoxia alert and increases deterioration).
  5. Partial update preserves unmodified vitals fields.
  6. Non-existent visit ID returns 404.
  7. Invalid vitals payload returns 422.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from aarogyaq.api import app
from aarogyaq.database import get_db
from aarogyaq.models import Patient, Visit, Vitals, AuditLog
from aarogyaq.orchestrator import assess_patient


@pytest.fixture(autouse=True)
def override_db(test_db):
    """Redirect FastAPI's get_db dependency to test_db fixture."""
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()


def _create_sample_visit(test_db, with_vitals: bool = True) -> Visit:
    """Helper to create a committed Patient + Visit in test_db."""
    patient = Patient(
        patient_id="ARQ-990001",
        name="Sunita Sharma",
        age=52,
        gender="Female",
    )
    test_db.add(patient)
    test_db.flush()

    visit = Visit(
        patient_id=patient.patient_id,
        chief_complaint="persistent cough and fatigue",
        pain_level=4,
        symptom_duration=3,
        existing_conditions="[\"Hypertension\"]",
        queue_type="General",
        status="Waiting",
        needs_reassessment=True,
    )
    test_db.add(visit)
    test_db.flush()

    if with_vitals:
        vitals = Vitals(
            visit_id=visit.visit_id,
            heart_rate=78,
            systolic_bp=125,
            diastolic_bp=82,
            respiratory_rate=16,
            spo2=98,
            temperature=98.6,
        )
        test_db.add(vitals)
        test_db.flush()

    assess_patient(test_db, visit.visit_id, use_ai=False)
    test_db.commit()
    return visit


@pytest.mark.asyncio
async def test_patch_vitals_existing_record(test_db):
    """Patching vitals updates existing DB record, triggers re-assessment and updates twin."""
    visit = _create_sample_visit(test_db, with_vitals=True)
    visit_id = visit.visit_id

    patch_payload = {
        "heart_rate": 135,
        "systolic_bp": 170,
        "spo2": 89,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch(f"/visits/{visit_id}/vitals", json=patch_payload)

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "success"
    assert data["visit_id"] == visit_id

    # Check vitals in response
    assert data["vitals"]["heart_rate"] == 135
    assert data["vitals"]["systolic_bp"] == 170
    assert data["vitals"]["spo2"] == 89
    # Unmodified fields should be preserved
    assert data["vitals"]["diastolic_bp"] == 82
    assert data["vitals"]["temperature"] == 98.6

    # Verify DB persistence
    updated_vitals = test_db.query(Vitals).filter(Vitals.visit_id == visit_id).first()
    assert updated_vitals is not None
    assert updated_vitals.heart_rate == 135
    assert updated_vitals.spo2 == 89

    # Verify re-assessment was recorded
    assert data["assessment"]["is_reassessment"] is True

    # Verify Digital Twin alert reasons reflect new vitals (hypoxia + tachycardia + hypertension)
    twin = data["twin"]
    assert twin is not None
    alert_reasons = twin.get("alert_reasons", [])
    reasons_str = " ".join(alert_reasons)
    assert "hypoxia" in reasons_str.lower() or "spo₂" in reasons_str.lower()
    assert "tachycardia" in reasons_str.lower() or "heart rate" in reasons_str.lower()

    # Verify Audit log was written
    logs = test_db.query(AuditLog).filter(AuditLog.visit_id == visit_id, AuditLog.action == "VITALS_UPDATED").all()
    assert len(logs) >= 1


@pytest.mark.asyncio
async def test_patch_vitals_initial_creation(test_db):
    """Patching vitals on a visit without previous vitals creates a new Vitals row."""
    visit = _create_sample_visit(test_db, with_vitals=False)
    visit_id = visit.visit_id

    # Verify no vitals exist initially
    assert test_db.query(Vitals).filter(Vitals.visit_id == visit_id).first() is None

    patch_payload = {
        "heart_rate": 92,
        "systolic_bp": 130,
        "diastolic_bp": 85,
        "respiratory_rate": 18,
        "spo2": 96,
        "temperature": 99.1,
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch(f"/visits/{visit_id}/vitals", json=patch_payload)

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["vitals"]["spo2"] == 96
    assert data["vitals"]["heart_rate"] == 92

    # Verify in DB
    vitals_row = test_db.query(Vitals).filter(Vitals.visit_id == visit_id).first()
    assert vitals_row is not None
    assert vitals_row.spo2 == 96
    assert vitals_row.temperature == 99.1


@pytest.mark.asyncio
async def test_patch_vitals_not_found(test_db):
    """Patching vitals on a non-existent visit returns 404."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch("/visits/999999/vitals", json={"spo2": 95})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_patch_vitals_invalid_payload(test_db):
    """Passing invalid data types for vitals returns 422."""
    visit = _create_sample_visit(test_db, with_vitals=True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.patch(f"/visits/{visit.visit_id}/vitals", json={"spo2": "invalid_number"})
    assert res.status_code == 422
