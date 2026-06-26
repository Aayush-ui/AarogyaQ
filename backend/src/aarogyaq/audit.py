"""
Single responsibility: write and retrieve audit log entries.

All state-changing operations in AarogyaQ emit an audit log entry via this
module.  The ``audit_logs`` table is append-only: rows are never modified or
deleted after creation.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from aarogyaq.models import AuditLog


from datetime import datetime
from sqlalchemy.orm import Session
from aarogyaq.models import AuditLog

VALID_ACTORS = frozenset({"nurse", "doctor", "system"})
VALID_ACTIONS = frozenset({
    "REGISTERED", "REASSESSED", "QUEUE_ASSIGNED",
    "STATUS_ATTENDING", "STATUS_COMPLETED",
    "SUMMARY_GENERATED", "DEPARTMENT_ROUTED",
    "DEPARTMENT_STATUS_CHANGED", "SYSTEM_ALERT_AGING"
})

def write_log(
    db: Session,
    visit_id: int | None,
    actor: str,
    action: str,
    notes: str | None = None
) -> AuditLog:
    """
    Write one audit log entry. Returns the created AuditLog ORM object.
    Raises ValueError if actor not in VALID_ACTORS or action not in VALID_ACTIONS.
    visit_id may be None for system-level events not tied to a visit.
    logged_at = datetime.utcnow() at time of call.
    """
    if actor not in VALID_ACTORS:
        raise ValueError(f"Invalid actor: {actor}")
    if action not in VALID_ACTIONS:
        raise ValueError(f"Invalid action: {action}")
        
    log_entry = AuditLog(
        actor=actor,
        action=action,
        visit_id=visit_id,
        notes=notes,
        logged_at=datetime.utcnow()
    )
    db.add(log_entry)
    db.flush()
    return log_entry

def get_logs_for_visit(db: Session, visit_id: int) -> list[AuditLog]:
    """Return all audit logs for a visit, ordered by logged_at ascending."""
    return db.query(AuditLog).filter(AuditLog.visit_id == visit_id).order_by(AuditLog.logged_at.asc()).all()

# Backwards compatibility wrappers
def log_event(db, actor, action, visit_id=None, notes=None):
    # Map old actions to new ones
    if action == "ASSESSED":
        action = "SUMMARY_GENERATED"
    elif action == "ATTENDING":
        action = "STATUS_ATTENDING"
    elif action == "COMPLETED":
        action = "STATUS_COMPLETED"
    elif action == "ROUTED":
        action = "DEPARTMENT_ROUTED"
    
    return write_log(db, visit_id, actor, action, notes)

def get_audit_trail(db, visit_id):
    return get_logs_for_visit(db, visit_id)
