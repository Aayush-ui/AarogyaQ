"""
Single responsibility: generate aggregate shift-level statistics.

Produces a structured report covering patient volumes, priority distribution,
average wait times, and department utilisation for a caller-supplied time
window.  All computation is deterministic SQL aggregation — no LLM calls.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session


class ShiftReportError(Exception):
    """Raised when shift report parameters are invalid."""


from aarogyaq.models import Visit

def generate_shift_report(
    db: Session,
    start_dt: datetime,
    end_dt: datetime,
) -> dict[str, Any]:
    """Produce a shift-level summary for visits completed within the window.

    Args:
        db: Active database session.
        start_dt: Inclusive start of the reporting window (UTC).
        end_dt: Exclusive end of the reporting window (UTC).

    Returns:
        A dict with the following keys:

        * ``"period"``                 — ``{"start": str, "end": str}``
        * ``"total_visits"``           — int
        * ``"by_priority"``            — ``{"Critical": int, "High": int, ...}``
        * ``"by_queue_type"``          — ``{"Emergency": int, "General": int}``
        * ``"avg_wait_minutes"``       — float
        * ``"avg_completion_minutes"`` — float
        * ``"department_breakdown"``   — ``{dept_name: int}``

    Raises:
        ShiftReportError: if *end_dt* is not strictly after *start_dt*.
    """
    if end_dt <= start_dt:
        raise ShiftReportError("end_dt must be strictly after start_dt")
        
    visits = db.query(Visit).filter(
        Visit.status == "Completed",
        Visit.completed_at >= start_dt,
        Visit.completed_at < end_dt
    ).all()
    
    total = len(visits)
    
    report = {
        "period": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
        },
        "total_visits": total,
        "by_priority": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
        "by_queue_type": {"Emergency": 0, "General": 0},
        "avg_wait_minutes": 0.0,
        "avg_completion_minutes": 0.0,
        "department_breakdown": {},
    }
    
    if total == 0:
        return report
        
    total_wait = 0.0
    total_comp = 0.0
    
    for v in visits:
        report["by_queue_type"][v.queue_type] = report["by_queue_type"].get(v.queue_type, 0) + 1
        
        dept = v.department_assigned or "Unassigned"
        report["department_breakdown"][dept] = report["department_breakdown"].get(dept, 0) + 1
        
        # Priority from latest assessment
        priority = "Low"
        if v.assessments:
            active_a = max(v.assessments, key=lambda x: x.assessment_id)
            priority = active_a.priority_level
        report["by_priority"][priority] = report["by_priority"].get(priority, 0) + 1
        
        wait_s = (v.attended_at - v.visit_timestamp).total_seconds() if v.attended_at else 0.0
        comp_s = (v.completed_at - v.visit_timestamp).total_seconds() if v.completed_at else 0.0
        
        total_wait += wait_s
        total_comp += comp_s
        
    report["avg_wait_minutes"] = round((total_wait / total) / 60.0, 2)
    report["avg_completion_minutes"] = round((total_comp / total) / 60.0, 2)
    
    return report
