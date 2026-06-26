import pytest
from aarogyaq.department import route_department, update_department_status, seed_departments
from aarogyaq.models import Department
import json
from pathlib import Path

@pytest.fixture
def clean_db_with_depts(test_db):
    test_db.query(Department).delete()
    test_db.commit()
    # Seed the DB so that queries for dept status work
    config_path = Path(__file__).parent.parent / "config" / "departments.json"
    seed_departments(test_db, config_path=config_path)
    return test_db

def test_route_critical(clean_db_with_depts):
    # Critical patient -> "Emergency" regardless of symptoms
    dept, status = route_department(["sore_throat"], "Critical", 30, clean_db_with_depts)
    assert dept == "Emergency"

def test_route_pediatrics(clean_db_with_depts):
    # Age 8, no critical symptoms -> "Pediatrics"
    dept, status = route_department(["sore_throat"], "Low", 8, clean_db_with_depts)
    assert dept == "Pediatrics"

def test_route_cardiology(clean_db_with_depts):
    # chest_pain + hypertension_history, High priority -> "Cardiology"
    dept, status = route_department(["chest_pain", "hypertension_history"], "High", 50, clean_db_with_depts)
    assert dept == "Cardiology"

def test_route_neurology(clean_db_with_depts):
    # stroke_symptoms, High priority -> "Neurology"
    dept, status = route_department(["stroke_symptoms"], "High", 60, clean_db_with_depts)
    assert dept == "Neurology"

def test_route_general_opd(clean_db_with_depts):
    # no matching symptoms, Low priority -> "General OPD"
    dept, status = route_department(["random_unmapped"], "Low", 30, clean_db_with_depts)
    assert dept == "General OPD"

def test_update_status(clean_db_with_depts):
    # update_department_status to "Full": assert persisted in DB
    updated = update_department_status(clean_db_with_depts, "Neurology", "Full")
    assert updated.status == "Full"
    
    # Read back
    dept = clean_db_with_depts.query(Department).filter(Department.name == "Neurology").first()
    assert dept.status == "Full"
