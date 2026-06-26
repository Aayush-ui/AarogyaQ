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


from datetime import datetime
from sqlalchemy.orm import Session
from aarogyaq.models import Visit, AuditLog

def generate_shift_report(
    db: Session,
    shift_start: datetime,
    shift_end: datetime
) -> dict:
    """
    Aggregate all visits within [shift_start, shift_end] and return
    a report dict with exactly the specified structure.
    """
    # Find all visits that were registered in this shift window
    visits = db.query(Visit).filter(
        Visit.visit_timestamp >= shift_start,
        Visit.visit_timestamp <= shift_end
    ).all()
    
    report = {
        "shift_start": shift_start.isoformat(),
        "shift_end": shift_end.isoformat(),
        "total_patients": len(visits),
        "by_priority": {
            "Critical": 0,
            "High": 0,
            "Medium": 0,
            "Low": 0
        },
        "by_queue": {
            "Emergency": 0,
            "General": 0
        },
        "avg_wait_time_minutes": None,
        "longest_wait_minutes": None,
        "patients_completed": 0,
        "patients_still_waiting": 0,
        "stale_alert_count": 0
    }
    
    if not visits:
        return report

    wait_times = []
    
    for v in visits:
        # Queue stats
        if v.queue_type in report["by_queue"]:
            report["by_queue"][v.queue_type] += 1
            
        # Priority stats
        priority = "Low"
        if v.assessments:
            active = max(v.assessments, key=lambda a: a.assessment_id)
            priority = active.priority_level
        if priority in report["by_priority"]:
            report["by_priority"][priority] += 1
            
        # Status counts
        if v.status == "Completed":
            report["patients_completed"] += 1
            if v.visit_timestamp and v.attended_at:
                wait = (v.attended_at - v.visit_timestamp).total_seconds() / 60.0
                wait_times.append(wait)
        elif v.status == "Waiting":
            report["patients_still_waiting"] += 1
            
    if wait_times:
        report["avg_wait_time_minutes"] = sum(wait_times) / len(wait_times)
        report["longest_wait_minutes"] = max(wait_times)
        
    # Get stale alert count in this window
    stale_alerts = db.query(AuditLog).filter(
        AuditLog.action == "SYSTEM_ALERT_AGING",
        AuditLog.logged_at >= shift_start,
        AuditLog.logged_at <= shift_end
    ).count()
    
    report["stale_alert_count"] = stale_alerts
    
    return report
