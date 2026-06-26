"""
Single responsibility: convert a numeric risk score to a named priority level
and provide integer sort keys for queue ordering.

DETERMINISM GUARANTEE: pure functions with no I/O or randomness.
Same input always produces identical output.
"""
from __future__ import annotations

PRIORITY_THRESHOLDS: dict[str, tuple[int,int]] = {
    "Critical": (76, 100),
    "High": (51, 75),
    "Medium": (26, 50),
    "Low": (0, 25),
}

PRIORITY_COLORS: dict[str, str] = {
    "Critical": "#D32F2F",
    "High": "#F57C00",
    "Medium": "#F9A825",
    "Low": "#388E3C",
}

QUEUE_ASSIGNMENT: dict[str, str] = {
    "Critical": "Emergency",
    "High": "Emergency",
    "Medium": "General",
    "Low": "General",
}

def classify(score: float) -> str:
    """Map risk score (0-100) to priority level string.
    Uses PRIORITY_THRESHOLDS. Score outside [0,100] raises ValueError.
    """
    if not (0 <= score <= 100):
        raise ValueError(f"Score {score} is outside [0, 100]")
        
    for priority, (low, high) in PRIORITY_THRESHOLDS.items():
        if low <= score <= high:
            return priority
            
    # Fallback for floats that might slip between integer boundaries, e.g. 25.5
    if score >= 76:
        return "Critical"
    elif score >= 51:
        return "High"
    elif score >= 26:
        return "Medium"
    else:
        return "Low"

def get_color(priority: str) -> str:
    """Return hex color string for a priority level.
    Raises ValueError for unknown priority.
    """
    if priority not in PRIORITY_COLORS:
        raise ValueError(f"Unknown priority: {priority}")
    return PRIORITY_COLORS[priority]

def get_queue(priority: str) -> str:
    """Return "Emergency" or "General" for a priority level."""
    if priority not in QUEUE_ASSIGNMENT:
        raise ValueError(f"Unknown priority: {priority}")
    return QUEUE_ASSIGNMENT[priority]

def priority_to_sort_key(priority: str) -> int:
    """Return an integer sort key for a priority level (lower == more urgent)."""
    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    if priority not in order:
        raise ValueError(f"Unrecognised priority level: {priority}")
    return order[priority]
