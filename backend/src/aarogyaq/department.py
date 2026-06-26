"""
Single responsibility: manage hospital department records.

Provides functions to list, retrieve, update availability status, and seed
departments from ``config/departments.json``.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from aarogyaq.models import Department


import json
from datetime import datetime

def list_departments(db: Session) -> list[Department]:
    """Return all department records ordered by name.

    Args:
        db: Active database session.

    Returns:
        List of :class:`Department` ORM instances.
    """
    return db.query(Department).order_by(Department.name.asc()).all()


def get_department(db: Session, dept_id: int) -> Department:
    """Retrieve a single department by primary key.

    Args:
        db: Active database session.
        dept_id: Primary key of the department.

    Returns:
        The matching :class:`Department` ORM instance.

    Raises:
        KeyError: if no department with *dept_id* exists.
    """
    dept = db.get(Department, dept_id)
    if not dept:
        raise KeyError(f"Department {dept_id} not found")
    return dept


def update_department_status(
    db: Session,
    dept_id: int,
    status: str,
) -> Department:
    """Update the availability status of a department.

    Args:
        db: Active database session.
        dept_id: Primary key of the department.
        status: New status — ``"Available"``, ``"Busy"``, or ``"Full"``.

    Returns:
        The updated :class:`Department` ORM instance.

    Raises:
        KeyError: if the department does not exist.
        ValueError: if *status* is not a recognised value.
    """
    if status not in ("Available", "Busy", "Full"):
        raise ValueError(f"Invalid status: {status}")
        
    dept = db.get(Department, dept_id)
    if not dept:
        raise KeyError(f"Department {dept_id} not found")
        
    dept.status = status
    dept.updated_at = datetime.utcnow()
    db.flush()
    return dept


def seed_departments(
    db: Session,
    config_path: Path | None = None,
) -> int:
    """Populate the ``departments`` table from ``config/departments.json``.

    Operation is idempotent — departments that already exist are skipped.

    Args:
        db: Active database session.
        config_path: Override path to ``departments.json``.  Defaults to
                     ``backend/config/departments.json``.

    Returns:
        The number of new department rows inserted.

    Raises:
        FileNotFoundError: if the config file does not exist.
    """
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent / "config" / "departments.json"
        
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found at {config_path}")
        
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    if not isinstance(data, list):
        raise ValueError("JSON must be a list of departments")
        
    existing_names = {d.name for d in db.query(Department).all()}
    
    new_depts = []
    for item in data:
        # Assuming JSON is a list of strings or dicts with a 'name'
        name = item if isinstance(item, str) else item.get("name")
        if not name:
            continue
        if name not in existing_names:
            new_depts.append(Department(name=name, status="Available", updated_at=datetime.utcnow()))
            existing_names.add(name)
            
    if new_depts:
        db.add_all(new_depts)
        db.flush()
        
    return len(new_depts)
