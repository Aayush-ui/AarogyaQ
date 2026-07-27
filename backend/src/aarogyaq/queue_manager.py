"""
Single responsibility: manage the live patient queue.

Provides functions to retrieve the sorted active queue, change visit workflow
status, and transition visits through the ``Waiting → Attending → Completed``
lifecycle.  Every status change emits an audit log entry.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from aarogyaq.models import Visit
from aarogyaq.audit import log_event
from aarogyaq.priority import QUEUE_ASSIGNMENT

logger = logging.getLogger(__name__)

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

def get_active_sort_keys(v: Visit) -> tuple[int, float]:
    """Return a tuple (priority_sort_key, risk_score) for sorting.
    If the patient is deteriorating or in critical alert, uses Digital Twin projections.
    """
    from aarogyaq.priority import priority_to_sort_key
    
    if not v.assessments:
        return 3, 0.0
        
    latest = max(v.assessments, key=lambda a: a.assessment_id)
    priority = latest.priority_level
    risk_score = latest.risk_score
    
    try:
        import json
        from aarogyaq.digital_twin import compute_twin_state, TwinState
        
        vitals_dict = None
        if getattr(v, "vitals", None):
            vitals_dict = {
                "spo2":         v.vitals.spo2,
                "heart_rate":   v.vitals.heart_rate,
                "systolic_bp":  v.vitals.systolic_bp,
            }
        existing = json.loads(v.existing_conditions) if v.existing_conditions else []
        
        state: TwinState = compute_twin_state(
            visit_id=v.visit_id,
            visit_timestamp=v.visit_timestamp,
            initial_risk_score=float(latest.risk_score),
            initial_priority=latest.priority_level,
            age=v.patient.age,
            existing_conditions=existing,
            vitals=vitals_dict,
        )
        
        if state.alert_level in ["DETERIORATING", "CRITICAL_ALERT"]:
            priority = state.twin_priority
            risk_score = state.projected_risk_score
    except Exception:
        pass
        
    try:
        p_key = priority_to_sort_key(priority)
    except ValueError:
        p_key = 3
        
    return p_key, float(risk_score)

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
    
    def sort_key(v: Visit):
        p_key, risk_score = get_active_sort_keys(v)
        return (p_key, -risk_score, v.visit_timestamp, v.visit_id)
        
    visits.sort(key=sort_key)
    return visits

def get_general_queue(db: Session) -> list[Visit]:
    """Same as above but queue_type="General"."""
    visits = db.query(Visit).filter(
        Visit.status.in_(["Waiting", "Attending"]),
        Visit.queue_type == "General"
    ).all()
    
    def sort_key(v: Visit):
        p_key, risk_score = get_active_sort_keys(v)
        return (p_key, -risk_score, v.visit_timestamp, v.visit_id)
        
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
        
        # Trigger RL outcome feedback update directly
        try:
            # calculate minutes_to_attend
            minutes_to_attend = 0
            if visit.attended_at and visit.visit_timestamp:
                diff = visit.attended_at - visit.visit_timestamp
                minutes_to_attend = int(diff.total_seconds() / 60)
            
            # get latest priority level
            priority_level = "Low"
            if visit.assessments:
                latest = max(visit.assessments, key=lambda a: a.assessment_id)
                priority_level = latest.priority_level
                
            # calculate queue depth at the time of completion
            queue_depth = db.query(Visit).filter(
                Visit.status == "Waiting",
                Visit.queue_type == visit.queue_type,
                Visit.visit_id != visit.visit_id
            ).count()
            
            from aarogyaq.rl_agent import (
                load_agent, save_agent, make_state_key, select_action,
                compute_reward, update_qtable, apply_threshold_offset
            )
            agent = load_agent()
            state_key = make_state_key(
                queue_type=visit.queue_type,
                queue_depth=queue_depth,
            )
            action_idx = select_action(agent, state_key)
            reward = compute_reward(priority_level, minutes_to_attend)
            
            update_qtable(agent, state_key, action_idx, reward)
            apply_threshold_offset(agent, visit.queue_type, action_idx)
            save_agent(agent)
            
            logger.info("Auto RL feedback update succeeded for visit %s. Reward: %s, Action delta: %s", visit.visit_id, reward, action_idx)
        except Exception as exc:
            # Warn but do not crash the transaction if the RL feedback logic fails
            logger.warning("Auto RL feedback update failed for completed visit %s: %s", visit_id, exc)
        
    db.flush()
    log_event(db, actor=actor, action=new_status.upper(), visit_id=visit_id)
    return visit
