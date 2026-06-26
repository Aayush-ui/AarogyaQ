"""Tests for aarogyaq.shift_report — aggregate shift-level statistics."""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from aarogyaq.shift_report import ShiftReportError, generate_shift_report


from aarogyaq.models import Patient, Visit, Assessment

def test_generate_shift_report_returns_dict_valid_case(test_db):
    """generate_shift_report returns a dict with all expected keys for a valid window."""
    p = Patient(patient_id="ARQ-1", name="X", age=30, gender="Male")
    test_db.add(p)
    test_db.flush()
    
    now = datetime.utcnow()
    v = Visit(
        patient_id="ARQ-1",
        visit_timestamp=now - timedelta(hours=2),
        chief_complaint="A",
        pain_level=1,
        queue_type="General",
        status="Completed",
        attended_at=now - timedelta(hours=1),
        completed_at=now - timedelta(minutes=30),
        department_assigned="General OPD"
    )
    test_db.add(v)
    test_db.flush()
    
    common_args = {"raw_symptoms": "", "mapped_symptoms": "[]", "confidence_scores": "{}", "score_breakdown": "[]", "contributing_factors": "[]", "business_rule_flags": "[]"}
    a = Assessment(visit_id=v.visit_id, priority_level="Low", risk_score=10, **common_args)
    test_db.add(a)
    test_db.flush()
    
    report = generate_shift_report(test_db, now - timedelta(hours=3), now)
    assert report["total_visits"] == 1
    assert report["by_priority"]["Low"] == 1
    assert report["avg_wait_minutes"] == 60.0
    assert report["avg_completion_minutes"] == 90.0


def test_generate_shift_report_inverted_window_invalid_case(test_db):
    """generate_shift_report raises ShiftReportError when end_dt <= start_dt."""
    now = datetime.utcnow()
    with pytest.raises(ShiftReportError):
        generate_shift_report(test_db, now, now - timedelta(hours=1))


def test_generate_shift_report_empty_period_edge(test_db):
    """generate_shift_report returns zero-counts for a window with no visits."""
    now = datetime.utcnow()
    report = generate_shift_report(test_db, now - timedelta(hours=1), now)
    assert report["total_visits"] == 0
