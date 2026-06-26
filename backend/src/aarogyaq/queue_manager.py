"""
Single responsibility: manage the live patient queue.

Provides functions to retrieve the sorted active queue, change visit workflow
status, and transition visits through the ``Waiting → Attending → Completed``
lifecycle.  Every status change emits an audit log entry.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from aarogyaq.models import Visit


from aarogyaq.audit import log_event
from aarogyaq.priority import priority_to_sort_key

def get_active_queue(
    db: Session,
    queue_type: str | None = None,
) -> list[Visit]:
    """Return visits in ``Waiting`` or ``Attending`` status, priority-sorted.

    Ordering: priority ascending (Critical first), then ``visit_timestamp``
    ascending (longest wait first).

    Args:
        db: Active database session.
        queue_type: Optional filter — ``"Emergency"`` or ``"General"``.
                    Returns all queue types when *None*.

    Returns:
        Ordered list of :class:`Visit` ORM instances.

    Raises:
        ValueError: if *queue_type* is not a recognised value.
    """
    query = db.query(Visit).filter(Visit.status.in_(["Waiting", "Attending"]))
    if queue_type is not None:
        if queue_type not in ["Emergency", "General"]:
            raise ValueError(f"Unrecognised queue_type: {queue_type}")
        query = query.filter(Visit.queue_type == queue_type)

    visits = query.all()
    
    def sort_key(v: Visit):
        priority = 4  # Default lowest
        if v.assessments:
            active = max(v.assessments, key=lambda a: a.assessment_id)
            priority = priority_to_sort_key(active.priority_level)
        # Using visit_id as secondary tie-breaker if visit_timestamp matches
        return (priority, v.visit_timestamp, v.visit_id)
        
    visits.sort(key=sort_key)
    return visits


def update_visit_status(
    db: Session,
    visit_id: int,
    new_status: str,
    actor: str,
    department_assigned: str | None = None,
) -> Visit:
    """Update the workflow status of a visit and emit an audit log entry.

    Args:
        db: Active database session.
        visit_id: Primary key of the visit to update.
        new_status: Target status — ``"Waiting"``, ``"Attending"``, or
                    ``"Completed"``.
        actor: Identifier of the acting entity (e.g. ``"nurse"``).
        department_assigned: Department name to assign when routing.

    Returns:
        The updated :class:`Visit` ORM instance.

    Raises:
        KeyError: if no visit with *visit_id* exists.
        ValueError: if the requested status transition is not permitted.
    """
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")

    valid_transitions = {
        "Waiting": ["Attending", "Completed"],
        "Attending": ["Completed", "Waiting"],
        "Completed": []
    }
    
    if new_status not in valid_transitions.get(visit.status, []):
        raise ValueError(f"Cannot transition from {visit.status} to {new_status}")
        
    visit.status = new_status
    if department_assigned is not None:
        visit.department_assigned = department_assigned
        
    # flush visit so it is updated before audit
    db.flush()
    log_event(db, actor=actor, action=new_status.upper(), visit_id=visit_id)
    return visit


from datetime import datetime

def mark_attending(db: Session, visit_id: int, actor: str = "doctor") -> Visit:
    """Transition a visit from ``Waiting`` to ``Attending`` and stamp ``attended_at``.

    Args:
        db: Active database session.
        visit_id: Primary key of the visit.
        actor: Actor triggering the transition.

    Returns:
        The updated :class:`Visit` ORM instance.

    Raises:
        KeyError: if the visit does not exist.
        ValueError: if the visit is not currently ``"Waiting"``.
    """
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")
    if visit.status != "Waiting":
        raise ValueError(f"Visit is {visit.status}, not Waiting")
        
    visit.attended_at = datetime.utcnow()
    return update_visit_status(db, visit_id, "Attending", actor)


def mark_completed(db: Session, visit_id: int, actor: str = "doctor") -> Visit:
    """Transition a visit to ``Completed`` and stamp ``completed_at``.

    Args:
        db: Active database session.
        visit_id: Primary key of the visit.
        actor: Actor triggering the transition.

    Returns:
        The updated :class:`Visit` ORM instance.

    Raises:
        KeyError: if the visit does not exist.
        ValueError: if the visit is not currently ``"Attending"``.
    """
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")
    if visit.status != "Attending":
        raise ValueError(f"Visit is {visit.status}, not Attending")
        
    visit.completed_at = datetime.utcnow()
    return update_visit_status(db, visit_id, "Completed", actor)
