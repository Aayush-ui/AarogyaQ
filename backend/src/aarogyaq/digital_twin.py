"""
Single responsibility: compute a per-patient Digital Twin state that projects
the patient's clinical condition forward in time without new measurements.

The twin evolves deterministically from:
  - Initial risk score recorded at triage assessment
  - Priority level
  - Elapsed wait time since registration
  - Patient age and existing comorbidities
  - Vitals at intake (SpO₂, heart rate, blood pressure)

DETERMINISM GUARANTEE: no network calls, no randomness, no model calls.
Given the same inputs the function always returns byte-identical output.

Academic basis: mirrors early-warning scoring escalation models (NEWS2, MEWS)
used in real hospital digital twin research.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

# ── Deterioration rate constants (points per minute) ─────────────────────────

_BASE_RATE: dict[str, float] = {
    "Critical": 3.0,
    "High":     1.5,
    "Medium":   0.8,
    "Low":      0.3,
}

# Extra rate added per qualifying modifier
_AGE_MODIFIER_RATE:         float = 0.5   # age > 65
_COMORBIDITY_RATE:          float = 0.3   # per existing condition
_LOW_SPO2_RATE:             float = 2.0   # SpO₂ < 94 %
_TACHYCARDIA_RATE:          float = 1.5   # heart rate > 120 bpm
_HYPERTENSION_RATE:         float = 0.8   # systolic BP > 160 mmHg

# Alert thresholds
_CRITICAL_ALERT_SCORE:  float = 90.0
_CRITICAL_ALERT_WAIT:   int   = 15    # minutes
_DETERIORATING_SCORE:   float = 76.0
_DETERIORATING_DELTA:   float = 20.0  # points gained since arrival
_MONITOR_DELTA:         float = 10.0  # points gained since arrival


@dataclass
class TwinState:
    """Projected patient state computed by the Digital Twin model.

    Attributes:
        visit_id:             Unique visit identifier.
        initial_risk_score:   Risk score recorded at triage.
        projected_risk_score: Score projected forward in time.
        twin_priority:        Priority derived from projected score.
        deterioration_rate:   Points gained per minute (composite).
        minutes_waiting:      Elapsed minutes since visit registration.
        alert_level:          STABLE | MONITOR | DETERIORATING | CRITICAL_ALERT.
        alert_reasons:        Human-readable XAI justifications for alert level.
        computed_at:          UTC timestamp when this twin state was computed.
    """
    visit_id:             int
    initial_risk_score:   float
    projected_risk_score: float
    twin_priority:        str
    deterioration_rate:   float
    minutes_waiting:      int
    alert_level:          str
    alert_reasons:        list[str] = field(default_factory=list)
    computed_at:          str = ""


def compute_twin_state(
    visit_id:             int,
    visit_timestamp:      datetime,
    initial_risk_score:   float,
    initial_priority:     str,
    age:                  int,
    existing_conditions:  list[str],
    vitals:               dict[str, Any] | None = None,
    now:                  datetime | None = None,
) -> TwinState:
    """Project the patient's clinical state forward from registration time.

    Args:
        visit_id:            Database visit ID.
        visit_timestamp:     UTC datetime when the visit was registered.
        initial_risk_score:  Risk score (0–100) assigned at triage.
        initial_priority:    Priority level string (Critical/High/Medium/Low).
        age:                 Patient age in years.
        existing_conditions: List of known comorbidity strings.
        vitals:              Optional dict with keys heart_rate, systolic_bp, spo2, etc.
        now:                 UTC datetime to use as current time (defaults to utcnow).

    Returns:
        A :class:`TwinState` with projected score, alert level and XAI reasons.

    Raises:
        ValueError: if initial_priority is not a recognised level.
    """
    if initial_priority not in _BASE_RATE:
        raise ValueError(
            f"Unknown priority level: {initial_priority!r}. "
            f"Expected one of {list(_BASE_RATE)}"
        )

    if now is None:
        now = datetime.utcnow()

    # ── 1. Elapsed time ───────────────────────────────────────────────────────
    elapsed_seconds = max(0.0, (now - visit_timestamp).total_seconds())
    minutes_waiting = int(elapsed_seconds / 60)

    # ── 2. Composite deterioration rate ──────────────────────────────────────
    rate = _BASE_RATE[initial_priority]
    reasons: list[str] = []

    if age > 65:
        rate += _AGE_MODIFIER_RATE
        reasons.append(f"Age {age} (>65) — elevated deterioration risk")

    if existing_conditions:
        comorbidity_bonus = _COMORBIDITY_RATE * len(existing_conditions)
        rate += comorbidity_bonus
        cond_str = ", ".join(existing_conditions[:3])
        reasons.append(
            f"{len(existing_conditions)} comorbidities ({cond_str}…) — compounding risk"
        )

    if vitals:
        spo2 = vitals.get("spo2")
        hr   = vitals.get("heart_rate")
        sbp  = vitals.get("systolic_bp")

        if spo2 is not None and spo2 < 94:
            rate += _LOW_SPO2_RATE
            reasons.append(f"SpO₂ {spo2}% (<94%) — hypoxia indicator")

        if hr is not None and hr > 120:
            rate += _TACHYCARDIA_RATE
            reasons.append(f"Heart rate {hr} bpm (>120) — tachycardia")

        if sbp is not None and sbp > 160:
            rate += _HYPERTENSION_RATE
            reasons.append(f"Systolic BP {sbp} mmHg (>160) — hypertensive")

    # ── 3. Projected score ────────────────────────────────────────────────────
    score_delta = rate * minutes_waiting
    projected   = min(100.0, initial_risk_score + score_delta)
    projected   = round(projected, 2)

    # ── 4. Derived twin priority ──────────────────────────────────────────────
    twin_priority = _score_to_priority(projected)

    # ── 5. Alert level ────────────────────────────────────────────────────────
    alert_level = _compute_alert_level(
        projected, initial_risk_score, score_delta, minutes_waiting, initial_priority
    )
    if alert_level in ("CRITICAL_ALERT", "DETERIORATING"):
        reasons.append(
            f"Projected score {projected:.1f} (was {initial_risk_score:.1f}) "
            f"after {minutes_waiting} min wait"
        )

    return TwinState(
        visit_id=visit_id,
        initial_risk_score=round(initial_risk_score, 2),
        projected_risk_score=projected,
        twin_priority=twin_priority,
        deterioration_rate=round(rate, 3),
        minutes_waiting=minutes_waiting,
        alert_level=alert_level,
        alert_reasons=reasons,
        computed_at=now.isoformat(),
    )


# ── Private helpers ───────────────────────────────────────────────────────────

def _score_to_priority(score: float) -> str:
    """Map a 0–100 score to a priority label."""
    if score >= 76:
        return "Critical"
    if score >= 51:
        return "High"
    if score >= 26:
        return "Medium"
    return "Low"


def _compute_alert_level(
    projected:        float,
    initial:          float,
    delta:            float,
    minutes_waiting:  int,
    initial_priority: str,
) -> str:
    """Classify the twin's alert level from current projected state."""
    if projected >= _CRITICAL_ALERT_SCORE and minutes_waiting > _CRITICAL_ALERT_WAIT:
        return "CRITICAL_ALERT"

    # Critical patients who have waited any meaningful time are DETERIORATING
    if initial_priority == "Critical" and minutes_waiting > 10:
        return "DETERIORATING"

    if projected >= _DETERIORATING_SCORE or delta >= _DETERIORATING_DELTA:
        return "DETERIORATING"

    if delta >= _MONITOR_DELTA:
        return "MONITOR"

    return "STABLE"
