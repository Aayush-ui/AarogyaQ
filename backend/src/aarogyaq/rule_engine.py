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
import json
from pathlib import Path
from typing import Any

PRIORITY_THRESHOLDS = {
    "Critical": (76, 100),
    "High": (51, 75),
    "Medium": (26, 50),
    "Low": (0, 25),
}

def load_clinical_rules(path: str = "backend/config/clinical_rules.json") -> list[dict]:
    """Load and return the list of clinical rule dicts. Raises FileNotFoundError
    if path missing. Raises ValueError if JSON structure is malformed."""
    file_path = Path(path)
    if not file_path.exists():
        # Fallback to absolute if ran from somewhere else or root
        alt_path = Path(__file__).parent.parent.parent.parent / path
        if alt_path.exists():
            file_path = alt_path
        else:
            raise FileNotFoundError(f"Config not found at {path}")
            
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON content must be a list")
    return data

def load_business_rules(path: str = "backend/config/business_rules.json") -> list[dict]:
    file_path = Path(path)
    if not file_path.exists():
        alt_path = Path(__file__).parent.parent.parent.parent / path
        if alt_path.exists():
            file_path = alt_path
        else:
            raise FileNotFoundError(f"Config not found at {path}")
            
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON content must be a list")
    return data

def evaluate_rules(
    mapped_symptoms: list[str],
    pain_level: int,
    age: int,
    existing_conditions: list[str],
    rules: list[dict]
) -> tuple[float, list[dict], list[str]]:
    """
    Apply all rules against patient data. Returns:
    (total_score, fired_rules_list, contributing_factors_list)
    A rule fires when:
    - operator=="AND": ALL conditions in the rule's conditions list
      are satisfied.
    - operator=="OR": ANY condition is satisfied.
    """
    total_score = 0.0
    fired_rules_list = []
    contributing_factors_list = []
    
    # Normalize inputs for case-insensitive matching
    all_symptoms = [s.lower() for s in mapped_symptoms] + [c.lower() for c in existing_conditions]
    
    for rule in rules:
        conditions = rule.get("conditions", [])
        operator = rule.get("operator", "OR")
        
        conditions_met = []
        for cond in conditions:
            cond_str = str(cond).strip().lower()
            met = False
            
            # Numeric checks
            if "pain_level >=" in cond_str:
                val = int(cond_str.split(">=")[1].strip())
                if pain_level >= val:
                    met = True
            elif "age >=" in cond_str:
                val = int(cond_str.split(">=")[1].strip())
                if age >= val:
                    met = True
            elif "age <" in cond_str:
                val = int(cond_str.split("<")[1].strip())
                if age < val:
                    met = True
            else:
                # Plain string check
                if cond_str in all_symptoms:
                    met = True
                    
            if met:
                conditions_met.append(cond)
                
        fires = False
        if operator == "AND" and len(conditions_met) == len(conditions) and len(conditions) > 0:
            fires = True
        elif operator == "OR" and len(conditions_met) > 0:
            fires = True
            
        if fires:
            score = float(rule.get("score", 0))
            total_score += score
            fired_rules_list.append({
                "rule_id": rule.get("rule_id"),
                "label": rule.get("label"),
                "score": score,
                "conditions_met": conditions_met
            })
            contributing_factors_list.append(rule.get("label"))
            
    total_score = max(0.0, min(100.0, total_score))
    return total_score, fired_rules_list, contributing_factors_list

def apply_business_rules(
    base_priority: str,
    mapped_symptoms: list[str],
    pain_level: int,
    age: int,
    business_rules: list[dict]
) -> tuple[str, list[str]]:
    """
    Apply business overrides after scoring. Returns:
    (final_priority, business_rule_flags_fired)
    """
    priorities = ["Low", "Medium", "High", "Critical"]
    
    def priority_val(p: str) -> int:
        if p in priorities:
            return priorities.index(p)
        return -1

    current_prio_idx = priority_val(base_priority)
    flags_fired = []
    
    all_symptoms = [s.lower() for s in mapped_symptoms]
    
    for rule in business_rules:
        conds = rule.get("conditions", {})
        met = True
        
        if "age_gt" in conds and not (age > conds["age_gt"]):
            met = False
        if "age_lt" in conds and not (age < conds["age_lt"]):
            met = False
        if "pain_level_eq" in conds and not (pain_level == conds["pain_level_eq"]):
            met = False
        if "pain_gte" in conds and not (pain_level >= conds["pain_gte"]):
            met = False
        if "symptoms_include" in conds:
            for s in conds["symptoms_include"]:
                if s.lower() not in all_symptoms:
                    met = False
                    break
                    
        if met:
            flags_fired.append(rule.get("flag"))
            action = rule.get("action")
            if action == "force_priority":
                force_to = rule.get("force_to")
                if priority_val(force_to) != -1:
                    current_prio_idx = priority_val(force_to)
            elif action == "minimum_priority":
                min_prio = rule.get("minimum")
                if priority_val(min_prio) > current_prio_idx:
                    current_prio_idx = priority_val(min_prio)
                    
    final_priority = priorities[current_prio_idx] if current_prio_idx >= 0 else base_priority
    return final_priority, flags_fired

