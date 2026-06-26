"""Tests for aarogyaq.queue_manager — live queue retrieval and status transitions."""
from __future__ import annotations

import pytest

from aarogyaq.queue_manager import (
    get_active_queue,
    mark_attending,
    mark_completed,
    update_visit_status,
)


from aarogyaq.models import Patient, Visit, Assessment
from datetime import datetime, timedelta
import pytest

def test_get_active_queue_returns_sorted_list_valid_case(test_db):
    """get_active_queue returns visits sorted by priority then wait time."""
    now = datetime.utcnow()
    p = Patient(patient_id="ARQ-001", name="A", age=30, gender="Male", phone="123")
    test_db.add(p)
    test_db.flush()
    
    # 3 visits
    v1 = Visit(patient_id="ARQ-001", visit_timestamp=now - timedelta(minutes=10), chief_complaint="A", pain_level=1, queue_type="General", status="Waiting")
    v2 = Visit(patient_id="ARQ-001", visit_timestamp=now - timedelta(minutes=5), chief_complaint="B", pain_level=1, queue_type="General", status="Waiting")
    v3 = Visit(patient_id="ARQ-001", visit_timestamp=now - timedelta(minutes=1), chief_complaint="C", pain_level=1, queue_type="General", status="Waiting")
    test_db.add_all([v1, v2, v3])
    test_db.flush()
    
    # v1 priority Medium, v2 priority High, v3 priority Critical
    common_args = {"raw_symptoms": "", "mapped_symptoms": "[]", "confidence_scores": "{}", "score_breakdown": "[]", "contributing_factors": "[]", "business_rule_flags": "[]"}
    a1 = Assessment(visit_id=v1.visit_id, priority_level="Medium", risk_score=30, **common_args)
    a2 = Assessment(visit_id=v2.visit_id, priority_level="High", risk_score=60, **common_args)
    a3 = Assessment(visit_id=v3.visit_id, priority_level="Critical", risk_score=90, **common_args)
    test_db.add_all([a1, a2, a3])
    test_db.flush()
    
    q = get_active_queue(test_db)
    assert len(q) == 3
    assert q[0].visit_id == v3.visit_id # Critical
    assert q[1].visit_id == v2.visit_id # High
    assert q[2].visit_id == v1.visit_id # Medium


def test_update_visit_status_invalid_transition(test_db):
    """update_visit_status raises ValueError for a disallowed status transition."""
    p = Patient(patient_id="ARQ-002", name="B", age=20, gender="Male")
    test_db.add(p)
    test_db.flush()
    v = Visit(patient_id="ARQ-002", chief_complaint="A", pain_level=1, queue_type="General", status="Completed")
    test_db.add(v)
    test_db.flush()
    
    with pytest.raises(ValueError, match="Cannot transition"):
        update_visit_status(test_db, v.visit_id, "Attending", "nurse")


def test_get_active_queue_empty_db_edge(test_db):
    """get_active_queue returns an empty list when no active visits exist."""
    assert get_active_queue(test_db) == []
