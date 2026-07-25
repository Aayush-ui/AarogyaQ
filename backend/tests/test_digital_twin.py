"""
Tests for digital_twin.py

Coverage:
  - Valid: Critical patient waiting 20 min → CRITICAL_ALERT
  - Valid: Low priority patient waiting 5 min → STABLE
  - Valid: High priority with bad vitals → elevated rate
  - Edge: patient waiting 0 minutes → projected == initial score
  - Edge: score capped at 100
  - Invalid: unknown priority level → ValueError
  - Determinism: same inputs always produce same output
"""
from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from aarogyaq.digital_twin import TwinState, compute_twin_state


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_now() -> datetime:
    return datetime(2026, 1, 1, 12, 0, 0)


def _visit_ts(minutes_ago: int, now: datetime) -> datetime:
    return now - timedelta(minutes=minutes_ago)


# ── Valid cases ───────────────────────────────────────────────────────────────

def test_critical_patient_waiting_20_min_is_critical_alert():
    """Critical patient waiting > 15 min with high projected score → CRITICAL_ALERT."""
    now = _make_now()
    state = compute_twin_state(
        visit_id=1,
        visit_timestamp=_visit_ts(20, now),
        initial_risk_score=80.0,
        initial_priority="Critical",
        age=55,
        existing_conditions=[],
        vitals=None,
        now=now,
    )
    assert isinstance(state, TwinState)
    assert state.minutes_waiting == 20
    assert state.projected_risk_score == 100.0  # capped
    assert state.alert_level == "CRITICAL_ALERT"
    assert state.twin_priority == "Critical"


def test_low_priority_short_wait_is_stable():
    """Low priority patient waiting 5 min → STABLE."""
    now = _make_now()
    state = compute_twin_state(
        visit_id=2,
        visit_timestamp=_visit_ts(5, now),
        initial_risk_score=15.0,
        initial_priority="Low",
        age=30,
        existing_conditions=[],
        vitals=None,
        now=now,
    )
    assert state.alert_level == "STABLE"
    assert state.projected_risk_score > 15.0  # some increase
    assert state.projected_risk_score < 30.0  # but minimal
    assert state.minutes_waiting == 5


def test_high_priority_bad_vitals_elevated_rate():
    """High priority with low SpO₂ and tachycardia → higher rate than baseline."""
    now = _make_now()
    # Without vitals
    state_no_vitals = compute_twin_state(
        visit_id=3,
        visit_timestamp=_visit_ts(10, now),
        initial_risk_score=55.0,
        initial_priority="High",
        age=40,
        existing_conditions=[],
        vitals=None,
        now=now,
    )
    # With bad vitals
    state_bad_vitals = compute_twin_state(
        visit_id=3,
        visit_timestamp=_visit_ts(10, now),
        initial_risk_score=55.0,
        initial_priority="High",
        age=40,
        existing_conditions=[],
        vitals={"spo2": 91, "heart_rate": 130},
        now=now,
    )
    assert state_bad_vitals.projected_risk_score > state_no_vitals.projected_risk_score
    assert state_bad_vitals.deterioration_rate > state_no_vitals.deterioration_rate
    assert len(state_bad_vitals.alert_reasons) >= 2  # SpO₂ + HR reasons


def test_medium_with_comorbidities_has_higher_rate_than_without():
    """Comorbidities raise the deterioration rate."""
    now = _make_now()
    base = compute_twin_state(
        visit_id=4,
        visit_timestamp=_visit_ts(30, now),
        initial_risk_score=30.0,
        initial_priority="Medium",
        age=45,
        existing_conditions=[],
        vitals=None,
        now=now,
    )
    with_comorbidities = compute_twin_state(
        visit_id=4,
        visit_timestamp=_visit_ts(30, now),
        initial_risk_score=30.0,
        initial_priority="Medium",
        age=45,
        existing_conditions=["Diabetes", "Hypertension", "COPD"],
        vitals=None,
        now=now,
    )
    assert with_comorbidities.deterioration_rate > base.deterioration_rate
    assert with_comorbidities.projected_risk_score > base.projected_risk_score


# ── Edge cases ────────────────────────────────────────────────────────────────

def test_zero_wait_time_projected_equals_initial():
    """Patient registered right now → projected score == initial score."""
    now = _make_now()
    state = compute_twin_state(
        visit_id=5,
        visit_timestamp=now,   # exactly now, 0 minutes elapsed
        initial_risk_score=42.0,
        initial_priority="Medium",
        age=35,
        existing_conditions=[],
        vitals=None,
        now=now,
    )
    assert state.minutes_waiting == 0
    assert state.projected_risk_score == 42.0
    assert state.alert_level == "STABLE"


def test_score_is_capped_at_100():
    """Score can never exceed 100 regardless of wait time."""
    now = _make_now()
    state = compute_twin_state(
        visit_id=6,
        visit_timestamp=_visit_ts(120, now),   # 2 hours waiting
        initial_risk_score=90.0,
        initial_priority="Critical",
        age=80,
        existing_conditions=["Diabetes", "CHF"],
        vitals={"spo2": 88, "heart_rate": 140, "systolic_bp": 180},
        now=now,
    )
    assert state.projected_risk_score == 100.0


def test_alert_reasons_list_is_populated_for_deteriorating():
    """alert_reasons should be non-empty when alert level is DETERIORATING or worse."""
    now = _make_now()
    state = compute_twin_state(
        visit_id=7,
        visit_timestamp=_visit_ts(25, now),
        initial_risk_score=60.0,
        initial_priority="High",
        age=70,
        existing_conditions=["Heart Failure"],
        vitals={"spo2": 90},
        now=now,
    )
    assert state.alert_level in ("DETERIORATING", "CRITICAL_ALERT")
    assert len(state.alert_reasons) > 0


# ── Invalid cases ─────────────────────────────────────────────────────────────

def test_unknown_priority_raises_value_error():
    """Passing an unknown priority string must raise ValueError — never silently fail."""
    now = _make_now()
    with pytest.raises(ValueError, match="Unknown priority level"):
        compute_twin_state(
            visit_id=99,
            visit_timestamp=_visit_ts(10, now),
            initial_risk_score=50.0,
            initial_priority="URGENT",   # not in our vocabulary
            age=40,
            existing_conditions=[],
            now=now,
        )


# ── Determinism ───────────────────────────────────────────────────────────────

def test_determinism_same_input_same_output():
    """Calling compute_twin_state twice with identical inputs must return identical output."""
    now = _make_now()
    kwargs = dict(
        visit_id=10,
        visit_timestamp=_visit_ts(30, now),
        initial_risk_score=55.0,
        initial_priority="High",
        age=50,
        existing_conditions=["Diabetes"],
        vitals={"spo2": 96, "heart_rate": 95, "systolic_bp": 145},
        now=now,
    )
    s1 = compute_twin_state(**kwargs)
    s2 = compute_twin_state(**kwargs)

    assert s1.projected_risk_score == s2.projected_risk_score
    assert s1.deterioration_rate   == s2.deterioration_rate
    assert s1.alert_level          == s2.alert_level
    assert s1.alert_reasons        == s2.alert_reasons
    assert s1.twin_priority        == s2.twin_priority
