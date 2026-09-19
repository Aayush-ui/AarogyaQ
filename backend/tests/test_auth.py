"""
Tests for JWT Authentication, Login, and Protected Route Enforcement (R-SEC-01).
"""
import pytest
from httpx import AsyncClient, ASGITransport
from aarogyaq.api import app
from aarogyaq.auth import create_access_token, decode_access_token, get_current_user


@pytest.fixture(autouse=True)
def override_db(test_db):
    from aarogyaq.database import get_db
    app.dependency_overrides[get_db] = lambda: test_db
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_auth_login_valid_credentials():
    """Verify login succeeds with valid clinician accounts and returns signed JWT."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Nurse login
        res_nurse = await ac.post("/auth/login", json={
            "username": "nurse",
            "password": "nurse123",
            "role": "Nurse"
        })
        assert res_nurse.status_code == 200
        nurse_data = res_nurse.json()
        assert "access_token" in nurse_data
        assert nurse_data["role"] == "Nurse"
        assert nurse_data["name"] == "Nurse Rahul"

        # Verify decoded token claims
        claims = decode_access_token(nurse_data["access_token"])
        assert claims["sub"] == "nurse"
        assert claims["role"] == "Nurse"

        # Doctor login
        res_doctor = await ac.post("/auth/login", json={
            "username": "doctor",
            "password": "doctor123",
            "role": "Doctor"
        })
        assert res_doctor.status_code == 200
        doc_data = res_doctor.json()
        assert doc_data["role"] == "Doctor"
        assert doc_data["name"] == "Dr. Arvind Swamy"

        # Admin login
        res_admin = await ac.post("/auth/login", json={
            "username": "admin",
            "password": "admin123",
            "role": "Administrator"
        })
        assert res_admin.status_code == 200
        admin_data = res_admin.json()
        assert admin_data["role"] == "Administrator"


@pytest.mark.asyncio
async def test_auth_login_invalid_credentials():
    """Verify login rejects invalid passwords and non-existent users."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Wrong password
        res_wrong_pw = await ac.post("/auth/login", json={
            "username": "doctor",
            "password": "wrongpassword",
            "role": "Doctor"
        })
        assert res_wrong_pw.status_code == 401

        # Unknown username
        res_unknown = await ac.post("/auth/login", json={
            "username": "hacker",
            "password": "password123",
            "role": "Doctor"
        })
        assert res_unknown.status_code == 401

        # Role mismatch
        res_mismatch = await ac.post("/auth/login", json={
            "username": "nurse",
            "password": "nurse123",
            "role": "Administrator"
        })
        assert res_mismatch.status_code == 401


@pytest.mark.asyncio
async def test_auth_logout():
    """Verify logout endpoint returns success."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/auth/logout")
    assert res.status_code == 200
    assert res.json()["status"] == "success"


@pytest.mark.asyncio
async def test_route_protection_without_token():
    """Verify mutating routes reject unauthenticated requests when mock dependency is cleared."""
    # Temporarily remove default mock override for get_current_user to test real enforcement
    app.dependency_overrides.pop(get_current_user, None)

    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # Attempt to register patient without Bearer token
            res = await ac.post("/patients/register", json={
                "name": "Unauthorized Patient",
                "age": 40,
                "gender": "Male",
                "chief_complaint": "fever",
                "pain_level": 3,
                "existing_conditions": []
            })
            assert res.status_code == 401
            assert "Bearer" in res.headers.get("www-authenticate", "")

            # Attempt with invalid token
            res_invalid = await ac.post(
                "/patients/register",
                headers={"Authorization": "Bearer invalid.fake.token"},
                json={
                    "name": "Unauthorized Patient",
                    "age": 40,
                    "gender": "Male",
                    "chief_complaint": "fever",
                    "pain_level": 3,
                    "existing_conditions": []
                }
            )
            assert res_invalid.status_code == 401

            # Authenticate to get real token
            login_res = await ac.post("/auth/login", json={
                "username": "nurse",
                "password": "nurse123",
                "role": "Nurse"
            })
            assert login_res.status_code == 200
            token = login_res.json()["access_token"]

            # Access /auth/me with valid Bearer token
            me_res = await ac.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_res.status_code == 200
            assert me_res.json()["sub"] == "nurse"

            # Register patient with valid Bearer token
            res_valid = await ac.post(
                "/patients/register",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "name": "Authorized Patient",
                    "age": 40,
                    "gender": "Male",
                    "chief_complaint": "fever",
                    "pain_level": 3,
                    "existing_conditions": []
                }
            )
            assert res_valid.status_code == 201
    finally:
        # Restore default override for test fixture isolation
        app.dependency_overrides[get_current_user] = lambda: {
            "sub": "doctor",
            "role": "Doctor",
            "name": "Dr. Arvind Swamy",
            "email": "doctor@aarogyaq.gov.in"
        }
