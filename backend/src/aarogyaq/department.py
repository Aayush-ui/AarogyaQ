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
    """Return all department records ordered by name."""
    return db.query(Department).order_by(Department.name.asc()).all()

def get_department(db: Session, dept_id: int) -> Department:
    dept = db.get(Department, dept_id)
    if not dept:
        raise KeyError(f"Department {dept_id} not found")
    return dept

from functools import lru_cache

@lru_cache(maxsize=1)
def load_department_config(
    path: str = "backend/config/departments.json"
) -> list[dict]:
    """Load and return department routing config list."""
    # Resolve relative to project root
    root = Path(__file__).parent.parent.parent.parent
    config_path = root / path
    if not config_path.exists():
        # Fallback to local
        config_path = Path(path)
    
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def route_department(
    mapped_symptoms: list[str],
    priority_level: str,
    age: int,
    db: Session
) -> tuple[str, str]:
    """
    Suggest the best department and return its current status.
    Rules (apply in this exact priority order):
    1. If priority_level == "Critical": always route to "Emergency"
    regardless of symptoms.
    2. If age < 14: route to "Pediatrics" unless priority is Critical
    (rule 1 already handled).
    3. Otherwise: score each department by count of its symptom_keywords
    that appear in mapped_symptoms. Route to highest-scoring dept.
    If tie or no match: route to "General OPD".
    Fetch the routed department's current status from the DB.
    Return (department_name, status).
    """
    if priority_level == "Critical":
        routed_name = "Emergency"
    elif age < 14:
        routed_name = "Pediatrics"
    else:
        config = load_department_config()
        best_score = 0
        best_dept = "General OPD"
        
        # Calculate scores
        dept_scores = []
        for dept in config:
            name = dept["name"]
            keywords = dept["symptom_keywords"]
            score = sum(1 for sym in mapped_symptoms if sym in keywords)
            if score > best_score:
                best_score = score
                best_dept = name
            elif score == best_score and score > 0:
                # Handle ties by retaining the first one that reached the score, 
                # or fallback to General OPD if there's an ambiguity?
                # The rule says "If tie or no match: route to 'General OPD'."
                best_dept = "General OPD"
                
        # Re-evaluate tie condition correctly:
        # Actually, let's strictly count:
        if best_score > 0:
            # find how many departments have the best_score
            top_depts = [d["name"] for d in config if sum(1 for sym in mapped_symptoms if sym in d["symptom_keywords"]) == best_score]
            
            # Phase 6: Emergency -> Specialty -> Fallback
            if "Emergency" in top_depts:
                routed_name = "Emergency"
            elif len(top_depts) == 1:
                routed_name = top_depts[0]
            else:
                routed_name = "General OPD"
        else:
            routed_name = "General OPD"

    # Fetch status from DB
    dept = db.query(Department).filter(Department.name == routed_name).first()
    status = dept.status if dept else "Available"
    return routed_name, status

def update_department_status(
    db: Session,
    dept_name: str,
    new_status: str
) -> Department:
    """Update dept status. Raises ValueError for unknown dept or status."""
    if new_status not in ("Available", "Busy", "Full"):
        raise ValueError(f"Invalid status: {new_status}")
        
    dept = db.query(Department).filter(Department.name == dept_name).first()
    
    # Also support searching by ID to not break existing API routing
    if not dept:
        try:
            dept_id = int(dept_name)
            dept = db.get(Department, dept_id)
        except ValueError:
            pass
            
    if not dept:
        raise KeyError(f"Department {dept_name} not found")
        
    dept.status = new_status
    dept.updated_at = datetime.utcnow()
    db.flush()
    return dept

def seed_departments(
    db: Session,
    config_path: Path | None = None,
) -> int:
    """Populate the departments table from config/departments.json."""
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent / "config" / "departments.json"
        
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found at {config_path}")
        
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    existing_names = {d.name for d in db.query(Department).all()}
    
    new_depts = []
    for item in data:
        name = item.get("name")
        if not name:
            continue
        if name not in existing_names:
            new_depts.append(Department(name=name, status="Available", updated_at=datetime.utcnow()))
            existing_names.add(name)
            
    if new_depts:
        db.add_all(new_depts)
        db.flush()
        
    return len(new_depts)
