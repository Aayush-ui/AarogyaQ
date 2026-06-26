"""Tests for aarogyaq.department — department CRUD and seeding."""
from __future__ import annotations

import pytest

from aarogyaq.department import (
    get_department,
    list_departments,
    seed_departments,
    update_department_status,
)


import json
from aarogyaq.models import Department
import pytest
from aarogyaq.department import (
    get_department,
    list_departments,
    seed_departments,
    update_department_status,
)

def test_seed_departments_inserts_rows_valid_case(test_db, tmp_path):
    """seed_departments inserts department rows from a valid JSON config."""
    config_file = tmp_path / "departments.json"
    config_file.write_text(json.dumps(["Cardiology", "Neurology"]))
    
    count = seed_departments(test_db, config_file)
    assert count == 2
    depts = list_departments(test_db)
    assert len(depts) == 2
    assert "Cardiology" in [d.name for d in depts]


def test_update_department_status_invalid_value(test_db):
    """update_department_status raises ValueError for an unrecognised status."""
    dept = Department(name="General", status="Available")
    test_db.add(dept)
    test_db.flush()
    
    with pytest.raises(ValueError):
        update_department_status(test_db, dept.dept_id, "UnknownStatus")


def test_seed_departments_idempotent_edge(test_db, tmp_path):
    """Calling seed_departments twice does not insert duplicates."""
    config_file = tmp_path / "departments.json"
    config_file.write_text(json.dumps(["ENT", "Orthopedics"]))
    
    c1 = seed_departments(test_db, config_file)
    assert c1 == 2
    c2 = seed_departments(test_db, config_file)
    assert c2 == 0
    assert len(list_departments(test_db)) == 2
