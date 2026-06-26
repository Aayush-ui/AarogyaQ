"""
Single responsibility: manage the live patient queue.

Provides functions to retrieve the sorted active queue, change visit workflow
status, and transition visits through the ``Waiting → Attending → Completed``
lifecycle.  Every status change emits an audit log entry.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from aarogyaq.models import Visit
from aarogyaq.audit import log_event
from aarogyaq.priority import QUEUE_ASSIGNMENT

AGING_THRESHOLD_MINUTES = 45

def assign_queue(db: Session, visit_id: int, priority_level: str) -> str:
    """Set visit.queue_type based on priority_level using QUEUE_ASSIGNMENT
    from priority.py. Persist to DB. Return queue_type string.
    Write audit log: actor="system", action="QUEUE_ASSIGNED".
    """
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")
        
    if priority_level not in QUEUE_ASSIGNMENT:
        raise ValueError(f"Unknown priority_level: {priority_level}")
        
    queue_type = QUEUE_ASSIGNMENT[priority_level]
    visit.queue_type = queue_type
    
    db.flush()
    log_event(db, actor="system", action="QUEUE_ASSIGNED", visit_id=visit_id, notes=f"Assigned to {queue_type}")
    
    return queue_type

def get_emergency_queue(db: Session) -> list[Visit]:
    """Return all Waiting+Attending visits with queue_type="Emergency",
    ordered by priority (Critical first) then by visit_timestamp
    ascending (earlier arrivals first within same priority).
    Priority sort order: Critical=0, High=1, Medium=2, Low=3.
    """
    visits = db.query(Visit).filter(
        Visit.status.in_(["Waiting", "Attending"]),
        Visit.queue_type == "Emergency"
    ).all()
    
    from aarogyaq.priority import priority_to_sort_key
    
    def sort_key(v: Visit):
        priority = 3  # Default to Low
        risk_score = 0.0
        if v.assessments:
            active = max(v.assessments, key=lambda a: a.assessment_id)
            try:
                priority = priority_to_sort_key(active.priority_level)
                risk_score = active.risk_score
            except ValueError:
                pass
        return (priority, -risk_score, v.visit_timestamp, v.visit_id)
        
    visits.sort(key=sort_key)
    return visits

def get_general_queue(db: Session) -> list[Visit]:
    """Same as above but queue_type="General"."""
    visits = db.query(Visit).filter(
        Visit.status.in_(["Waiting", "Attending"]),
        Visit.queue_type == "General"
    ).all()
    
    from aarogyaq.priority import priority_to_sort_key
    
    def sort_key(v: Visit):
        priority = 3  # Default to Low
        risk_score = 0.0
        if v.assessments:
            active = max(v.assessments, key=lambda a: a.assessment_id)
            try:
                priority = priority_to_sort_key(active.priority_level)
                risk_score = active.risk_score
            except ValueError:
                pass
        return (priority, -risk_score, v.visit_timestamp, v.visit_id)
        
    visits.sort(key=sort_key)
    return visits

def get_stale_patients(db: Session) -> list[Visit]:
    """Return Waiting visits in General queue where
    (now - visit_timestamp) > AGING_THRESHOLD_MINUTES.
    These need a staff alert on the dashboard.
    """
    now = datetime.utcnow()
    threshold = now - timedelta(minutes=AGING_THRESHOLD_MINUTES)
    
    visits = db.query(Visit).filter(
        Visit.status == "Waiting",
        Visit.queue_type == "General",
        Visit.visit_timestamp < threshold
    ).all()
    
    return visits

def update_visit_status(
    db: Session,
    visit_id: int,
    new_status: str,
    actor: str
) -> Visit:
    """Update visit.status. If "Attending", set attended_at = now.
    If "Completed", set completed_at = now.
    Write audit log entry. Raises ValueError for unknown status.
    """
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")
        
    if new_status not in ["Attending", "Completed"]:
        if new_status == "Waiting":
            visit.status = "Waiting"
        else:
            raise ValueError(f"Unknown status: {new_status}")
    
    now = datetime.utcnow()
    
    if new_status == "Attending":
        if visit.status != "Waiting":
            raise ValueError(f"Cannot transition from {visit.status} to Attending")
        visit.attended_at = now
        visit.status = "Attending"
    elif new_status == "Completed":
        if visit.status != "Attending":
            raise ValueError(f"Cannot transition from {visit.status} to Completed")
        visit.completed_at = now
        visit.status = "Completed"
        
    db.flush()
    log_event(db, actor=actor, action=new_status.upper(), visit_id=visit_id)
    return visit
