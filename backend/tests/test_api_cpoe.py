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
async def test_add_clinical_note_valid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a visit
        reg = await ac.post("/patients/register", json={
            "name": "Test Note Patient",
            "age": 40,
            "gender": "Male",
            "chief_complaint": "Pain",
            "pain_level": 5,
            "existing_conditions": []
        })
        assert reg.status_code == 201
        visit_id = reg.json()["visit_id"]

        # Add note
        res = await ac.post(f"/visits/{visit_id}/notes", json={
            "author": "Dr. Smith",
            "note": "Patient is stable."
        })
        assert res.status_code == 201
        assert res.json()["status"] == "success"

        # Verify note in queue
        q_res = await ac.get("/queue/general")
        visits = q_res.json()
        my_visit = next((v for v in visits if v["visit"]["visit_id"] == visit_id), None)
        assert my_visit is not None
        assert len(my_visit["visit"]["clinical_notes"]) == 1
        assert my_visit["visit"]["clinical_notes"][0]["author"] == "Dr. Smith"
        assert my_visit["visit"]["clinical_notes"][0]["note"] == "Patient is stable."

@pytest.mark.asyncio
async def test_add_medication_invalid_visit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/visits/999999/medications", json={
            "doctor": "Dr. Smith",
            "name": "Aspirin",
            "dosage": "100mg",
            "frequency": "QD"
        })
        assert res.status_code == 422
        assert res.json()["detail"] == "Visit not found"

@pytest.mark.asyncio
async def test_bed_assignment_and_department_transfer():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create a visit
        reg = await ac.post("/patients/register", json={
            "name": "Transfer Patient",
            "age": 30,
            "gender": "Female",
            "chief_complaint": "Cough",
            "pain_level": 3,
            "existing_conditions": []
        })
        assert reg.status_code == 201
        visit_id = reg.json()["visit_id"]

        # Assign bed
        res_bed = await ac.patch(f"/visits/{visit_id}/bed", json={"bed": "Bed-12"})
        assert res_bed.status_code == 200

        # Transfer department
        res_dept = await ac.patch(f"/visits/{visit_id}/transfer", json={"department": "Pulmonology"})
        assert res_dept.status_code == 200

        # Verify changes
        q_res = await ac.get("/queue/general")
        my_visit = next((v for v in q_res.json() if v["visit"]["visit_id"] == visit_id), None)
        assert my_visit is not None
        assert my_visit["visit"]["bed_assigned"] == "Bed-12"
        assert my_visit["visit"]["department_assigned"] == "Pulmonology"
