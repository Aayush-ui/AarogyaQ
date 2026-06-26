"""
Single responsibility: write and retrieve audit log entries.

All state-changing operations in AarogyaQ emit an audit log entry via this
module.  The ``audit_logs`` table is append-only: rows are never modified or
deleted after creation.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from aarogyaq.models import AuditLog


def log_event(
    db: Session,
    actor: str,
    action: str,
    visit_id: int | None = None,
    notes: str | None = None,
) -> AuditLog:
    """Append a new audit log entry and flush it to the database.

    Args:
        db: Active database session.
        actor: Identifier of the acting entity: ``"nurse"``, ``"doctor"``,
               or ``"system"``.
        action: Action label (e.g. ``"REGISTERED"``, ``"ASSESSED"``,
                ``"REASSESSED"``, ``"ROUTED"``, ``"COMPLETED"``).
        visit_id: Associated visit ID; ``None`` for system-level events not
                  tied to a specific visit.
        notes: Optional free-text context for the event.

    Returns:
        The persisted :class:`AuditLog` ORM instance.

    Raises:
        ValueError: if *actor* or *action* is an empty string.
    """
    if not actor or not actor.strip():
        raise ValueError("actor cannot be empty")
    if not action or not action.strip():
        raise ValueError("action cannot be empty")
        
    log_entry = AuditLog(
        actor=actor.strip(),
        action=action.strip(),
        visit_id=visit_id,
        notes=notes,
    )
    db.add(log_entry)
    db.flush()
    return log_entry


def get_audit_trail(db: Session, visit_id: int) -> list[AuditLog]:
    """Retrieve all audit log entries for a visit, ordered by ``logged_at``.

    Args:
        db: Active database session.
        visit_id: The visit whose audit trail is requested.

    Returns:
        Ordered list of :class:`AuditLog` instances (may be empty).
    """
    return db.query(AuditLog).filter(AuditLog.visit_id == visit_id).order_by(AuditLog.logged_at.asc()).all()
