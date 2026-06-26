"""Tests for aarogyaq.priority — score-to-priority mapping and sort keys."""
from __future__ import annotations

import pytest

from aarogyaq.priority import priority_to_sort_key, score_to_priority


def test_score_to_priority_critical_valid_case():
    """score_to_priority returns 'Critical' for a score >= 75.0."""
    assert score_to_priority(80.0) == "Critical"


def test_score_to_priority_out_of_range_invalid_case():
    """score_to_priority raises ValueError for a score outside [0.0, 100.0]."""
    with pytest.raises(ValueError):
        score_to_priority(105.0)
    with pytest.raises(ValueError):
        score_to_priority(-5.0)


def test_score_to_priority_boundary_edge():
    """score_to_priority correctly classifies scores exactly on thresholds."""
    assert score_to_priority(75.0) == "Critical"
    assert score_to_priority(50.0) == "High"
    assert score_to_priority(25.0) == "Medium"
    assert score_to_priority(24.9) == "Low"
    assert score_to_priority(0.0) == "Low"
    assert score_to_priority(100.0) == "Critical"

def test_priority_to_sort_key_valid():
    """priority_to_sort_key returns correct integers."""
    assert priority_to_sort_key("Critical") == 0
    assert priority_to_sort_key("High") == 1
    assert priority_to_sort_key("Medium") == 2
    assert priority_to_sort_key("Low") == 3

def test_priority_to_sort_key_invalid():
    """priority_to_sort_key raises ValueError for invalid input."""
    with pytest.raises(ValueError):
        priority_to_sort_key("Unknown")
