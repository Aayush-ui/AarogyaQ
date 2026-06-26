"""Tests for aarogyaq.api — FastAPI route handlers."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from aarogyaq.api import app


import pytest
from httpx import AsyncClient, ASGITransport
from aarogyaq.api import app

@pytest.mark.asyncio
async def test_health_check_returns_200_valid_case():
    """GET /api/v1/health returns HTTP 200 with a liveness payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_patient_invalid_gender_returns_422():
    """POST /api/v1/patients with an invalid gender returns HTTP 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/patients", json={
            "name": "Jane",
            "age": 30,
            "gender": "Unknown",
            "phone": "555-1234"
        })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_open_visit_unknown_patient_returns_404_edge(test_db):
    """POST /api/v1/visits for a non-existent patient returns HTTP 404."""
    # We must override get_db to use test_db
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/visits", json={
                "patient_id": "ARQ-999",
                "chief_complaint": "Pain",
                "pain_level": 5,
                "symptom_duration": 10,
                "existing_conditions": [],
                "queue_type": "Emergency"
            })
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
