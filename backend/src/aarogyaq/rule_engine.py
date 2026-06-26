"""
Single responsibility: deterministic clinical rule evaluation.

Loads rule definitions from ``config/clinical_rules.json`` and
``config/business_rules.json``, evaluates each rule against structured patient
data, and returns a risk score, priority level, and full score breakdown.

DETERMINISM GUARANTEE: no network calls, no randomness, no model calls.
The same input always produces byte-identical output.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


class RuleEngineError(Exception):
    """Raised when rule evaluation fails due to invalid input or bad config."""


@dataclass
class EvaluationResult:
    """Structured output of the clinical rule engine.

    Attributes:
        risk_score: Deterministic numeric score in range [0.0, 100.0].
        priority_level: One of ``Critical``, ``High``, ``Medium``, ``Low``.
        score_breakdown: List of fired-rule dicts (name, points, reason).
        contributing_factors: Human-readable factor label strings.
        business_rule_flags: Override flag strings from business rules.
    """

    risk_score: float
    priority_level: str
    score_breakdown: list[dict[str, Any]] = field(default_factory=list)
    contributing_factors: list[str] = field(default_factory=list)
    business_rule_flags: list[str] = field(default_factory=list)


import json
from aarogyaq.priority import score_to_priority

def load_clinical_rules(config_path: Path | None = None) -> list[dict[str, Any]]:
    """Load clinical rule definitions from the JSON config file.

    Args:
        config_path: Override path to ``clinical_rules.json``.  Defaults to
                     ``backend/config/clinical_rules.json``.

    Returns:
        A list of rule definition dicts.

    Raises:
        FileNotFoundError: if the config file does not exist.
        ValueError: if the JSON content is not a list.
    """
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent / "config" / "clinical_rules.json"
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found at {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON content must be a list")
    return data


def load_business_rules(config_path: Path | None = None) -> list[dict[str, Any]]:
    """Load business rule definitions from the JSON config file.

    Args:
        config_path: Override path to ``business_rules.json``.  Defaults to
                     ``backend/config/business_rules.json``.

    Returns:
        A list of business rule dicts.

    Raises:
        FileNotFoundError: if the config file does not exist.
        ValueError: if the JSON content is not a list.
    """
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent / "config" / "business_rules.json"
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found at {config_path}")
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON content must be a list")
    return data


def evaluate_risk(
    pain_level: int,
    symptom_duration: int | None,
    existing_conditions: list[str],
    mapped_symptoms: list[str],
    queue_type: str,
    clinical_rules: list[dict[str, Any]] | None = None,
    business_rules: list[dict[str, Any]] | None = None,
) -> EvaluationResult:
    """Evaluate patient risk deterministically against clinical and business rules.

    Args:
        pain_level: Reported pain level on a 1–10 scale.
        symptom_duration: Duration of symptoms in minutes; ``None`` if unknown.
        existing_conditions: Pre-existing condition label strings.
        mapped_symptoms: Canonical clinical term strings from symptom mapping.
        queue_type: ``"Emergency"`` or ``"General"``.
        clinical_rules: Pre-loaded clinical rules; loads from config when None.
        business_rules: Pre-loaded business rules; loads from config when None.

    Returns:
        An :class:`EvaluationResult` with score, priority, and full breakdown.

    Raises:
        RuleEngineError: if *pain_level* is outside [1, 10] or *queue_type* is
                         not a recognised value.
    """
    if not 1 <= pain_level <= 10:
        raise RuleEngineError(f"Pain level must be 1-10, got {pain_level}")
    if queue_type not in ("Emergency", "General"):
        raise RuleEngineError(f"Queue type must be Emergency or General, got {queue_type}")
        
    score = 0.0
    breakdown = []
    factors = []
    
    # Base pain score
    pain_score = float(pain_level * 5)
    score += pain_score
    breakdown.append({"name": "Base Pain Score", "points": pain_score, "reason": f"Pain level {pain_level}"})
    factors.append(f"Pain: {pain_level}/10")
    
    if queue_type == "Emergency":
        score += 20.0
        breakdown.append({"name": "Emergency Queue", "points": 20.0, "reason": "Patient is in emergency queue"})
        
    # evaluate clinical rules
    if clinical_rules:
        for rule in clinical_rules:
            # dummy matching if rule defines required_symptom
            if "required_symptom" in rule and rule["required_symptom"] in mapped_symptoms:
                points = float(rule.get("score_modifier", 0))
                score += points
                breakdown.append({"name": rule.get("name", "Clinical Rule"), "points": points, "reason": "Matched symptom"})
                factors.append(f"Symptom: {rule['required_symptom']}")
                
    # evaluate business rules
    b_flags = []
    if business_rules:
        for rule in business_rules:
            if "required_condition" in rule and rule["required_condition"] in existing_conditions:
                points = float(rule.get("score_modifier", 0))
                score += points
                breakdown.append({"name": rule.get("name", "Business Rule"), "points": points, "reason": "Matched condition"})
                b_flags.append(rule.get("flag", "FLAGGED"))
                
    score = max(0.0, min(100.0, score))
    return EvaluationResult(
        risk_score=score,
        priority_level=score_to_priority(score),
        score_breakdown=breakdown,
        contributing_factors=factors,
        business_rule_flags=b_flags
    )
