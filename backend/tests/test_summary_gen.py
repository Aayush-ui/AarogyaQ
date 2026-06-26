"""Tests for aarogyaq.summary_gen — deterministic and AI-assisted summary generation."""
from __future__ import annotations

import pytest

from aarogyaq.summary_gen import generate_summary


def test_generate_summary_deterministic_valid_case():
    """generate_summary with use_ai=False returns a non-empty string."""
    summary = generate_summary(
        patient_name="John Doe",
        age=30,
        gender="Male",
        chief_complaint="Chest pain",
        pain_level=8,
        symptom_duration=60,
        existing_conditions=["Diabetes"],
        mapped_symptoms=["Chest Pain"],
        risk_score=75.0,
        priority_level="Critical",
        contributing_factors=["Pain: 8/10"],
        business_rule_flags=["FLAGGED"],
        use_ai=False
    )
    assert isinstance(summary, str)
    assert len(summary) > 0
    assert "John Doe" in summary
    assert "Critical" in summary


def test_generate_summary_empty_complaint_invalid_case():
    """generate_summary raises ValueError when chief_complaint is empty."""
    with pytest.raises(ValueError):
        generate_summary("John", 30, "Male", "", 8, 60, [], [], 75.0, "Critical", [], [])


def test_generate_summary_determinism_edge():
    """generate_summary(use_ai=False) produces identical output for identical input."""
    inputs = dict(
        patient_name="Jane", age=25, gender="Female", chief_complaint="Headache",
        pain_level=5, symptom_duration=30, existing_conditions=[], mapped_symptoms=["Headache"],
        risk_score=25.0, priority_level="Medium", contributing_factors=[], business_rule_flags=[]
    )
    res1 = generate_summary(**inputs, use_ai=False)
    res2 = generate_summary(**inputs, use_ai=False)
    assert res1 == res2
