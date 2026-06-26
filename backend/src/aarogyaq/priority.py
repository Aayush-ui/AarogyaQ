"""
Single responsibility: convert a numeric risk score to a named priority level
and provide integer sort keys for queue ordering.

DETERMINISM GUARANTEE: pure functions with no I/O or randomness.
Same input always produces identical output.
"""
from __future__ import annotations

# Score thresholds — FINAL.  Change only via a DB design revision.
CRITICAL_THRESHOLD: float = 75.0
HIGH_THRESHOLD: float = 50.0
MEDIUM_THRESHOLD: float = 25.0

# Lower sort key == higher urgency in the queue.
PRIORITY_SORT_ORDER: dict[str, int] = {
    "Critical": 0,
    "High": 1,
    "Medium": 2,
    "Low": 3,
}

_VALID_PRIORITIES: frozenset[str] = frozenset(PRIORITY_SORT_ORDER)


def score_to_priority(score: float) -> str:
    """Map a numeric risk score to a named priority level.

    Thresholds (inclusive lower bound):

    * ``Critical`` : score >= 75.0
    * ``High``     : score >= 50.0
    * ``Medium``   : score >= 25.0
    * ``Low``      : score <  25.0

    Args:
        score: Numeric risk score in the range [0.0, 100.0].

    Returns:
        One of ``"Critical"``, ``"High"``, ``"Medium"``, ``"Low"``.

    Raises:
        ValueError: if *score* is outside [0.0, 100.0].
    """
    if not 0.0 <= score <= 100.0:
        raise ValueError(f"Score {score} is outside [0.0, 100.0]")
    
    if score >= CRITICAL_THRESHOLD:
        return "Critical"
    elif score >= HIGH_THRESHOLD:
        return "High"
    elif score >= MEDIUM_THRESHOLD:
        return "Medium"
    else:
        return "Low"


def priority_to_sort_key(priority: str) -> int:
    """Return an integer sort key for a priority level (lower == more urgent).

    Args:
        priority: One of ``"Critical"``, ``"High"``, ``"Medium"``, ``"Low"``.

    Returns:
        Integer 0–3 (0 = Critical, 3 = Low).

    Raises:
        ValueError: if *priority* is not a recognised level.
    """
    if priority not in _VALID_PRIORITIES:
        raise ValueError(f"Unrecognised priority level: {priority}")
    return PRIORITY_SORT_ORDER[priority]
