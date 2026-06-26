"""Tests for aarogyaq.rule_engine — deterministic clinical risk evaluation."""
from __future__ import annotations

import pytest

from aarogyaq.rule_engine import EvaluationResult, RuleEngineError, evaluate_risk


def test_evaluate_risk_valid_case():
    """evaluate_risk returns an EvaluationResult for well-formed inputs."""
    res = evaluate_risk(
        pain_level=5,
        symptom_duration=60,
        existing_conditions=["Diabetes"],
        mapped_symptoms=["Chest Pain"],
        queue_type="General"
    )
    assert isinstance(res, EvaluationResult)
    assert res.risk_score == 25.0
    assert res.priority_level == "Medium"


def test_evaluate_risk_pain_level_out_of_range_invalid_case():
    """evaluate_risk raises RuleEngineError when pain_level is outside 1–10."""
    with pytest.raises(RuleEngineError):
        evaluate_risk(15, 60, [], [], "General")
    with pytest.raises(RuleEngineError):
        evaluate_risk(0, 60, [], [], "General")


def test_evaluate_risk_determinism_edge():
    """evaluate_risk produces identical output for identical input (determinism check)."""
    inputs = dict(
        pain_level=8,
        symptom_duration=30,
        existing_conditions=["Asthma"],
        mapped_symptoms=["Wheezing"],
        queue_type="Emergency"
    )
    res1 = evaluate_risk(**inputs)
    res2 = evaluate_risk(**inputs)
    assert res1 == res2
