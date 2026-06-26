"""
Single responsibility: deterministic clinical rule evaluation.

Loads rule definitions from ``config/clinical_rules.json`` and
``config/business_rules.json``, evaluates each rule against structured patient
data, and returns a risk score, priority level, and full score breakdown.

DETERMINISM GUARANTEE: no network calls, no randomness, no model calls.
The same input always produces byte-identical output.
"""
from __future__ import annotations

import json
from pathlib import Path

from functools import lru_cache

PRIORITY_THRESHOLDS = {
    "Critical": (76, 100),
    "High": (51, 75),
    "Medium": (26, 50),
    "Low": (0, 25),
}

@lru_cache(maxsize=1)
def load_clinical_rules(path: str = "backend/config/clinical_rules.json") -> list[dict]:
    """Load and return the list of clinical rule dicts."""
    file_path = Path(path)
    if not file_path.exists():
        alt_path = Path(__file__).parent.parent.parent.parent / path
        if alt_path.exists():
            file_path = alt_path
        else:
            raise FileNotFoundError(f"Config not found at {path}")
            
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@lru_cache(maxsize=1)
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
    return data

@lru_cache(maxsize=1)
def load_red_flag_rules(path: str = "backend/config/red_flag_rules.json") -> list[dict]:
    file_path = Path(path)
    if not file_path.exists():
        alt_path = Path(__file__).parent.parent.parent.parent / path
        if alt_path.exists():
            file_path = alt_path
        else:
            # return empty if missing to avoid hard fail during migration
            return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@lru_cache(maxsize=1)
def load_risk_weights(path: str = "backend/config/risk_weights.json") -> list[dict]:
    file_path = Path(path)
    if not file_path.exists():
        alt_path = Path(__file__).parent.parent.parent.parent / path
        if alt_path.exists():
            file_path = alt_path
        else:
            return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

def evaluate_red_flags(structured_findings: dict[str, bool], rules: list[dict]) -> tuple[bool, list[dict]]:
    """Layer 1: Critical Emergency Override Rules."""
    fired = []
    
    # Check simple inclusion of any red flag symptom
    for rule in rules:
        conds = rule.get("conditions", [])
        for c in conds:
            if structured_findings.get(c.lower(), False):
                fired.append({
                    "rule_id": rule.get("rule_id"),
                    "label": rule.get("label"),
                    "score": 100,
                    "conditions_met": [c]
                })
                break # one is enough per rule
                
    return len(fired) > 0, fired

def evaluate_rules(
    structured_findings: dict[str, bool],
    pain_level: int,
    age: int,
    existing_conditions: list[str],
    rules: list[dict]
) -> tuple[float, list[dict], list[str]]:
    """Layer 2: Weighted Clinical Rules."""
    total_score = 0.0
    fired_rules_list = []
    contributing_factors_list = []
    
    existing_lower = [c.lower() for c in existing_conditions]
    
    for rule in rules:
        conditions = rule.get("conditions", [])
        operator = rule.get("operator", "OR")
        
        conditions_met = []
        for cond in conditions:
            cond_str = str(cond).strip().lower()
            met = False
            
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
                # Check in structured_findings first
                if structured_findings.get(cond_str, False):
                    met = True
                elif cond_str in existing_lower:
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

def evaluate_risk_weights(
    current_score: float,
    structured_findings: dict[str, bool],
    pain_level: int,
    age: int,
    existing_conditions: list[str],
    symptom_duration: int | None,
    rules: list[dict]
) -> tuple[float, list[dict], list[str]]:
    """Layer 3: General Risk Rules."""
    fired = []
    labels = []
    score_modifier = 0.0
    
    for rule in rules:
        conds = rule.get("conditions", {})
        met = True
        
        if "age_gt" in conds and not (age > conds["age_gt"]):
            met = False
        if "age_lt" in conds and not (age < conds["age_lt"]):
            met = False
        if "pain_gte" in conds and not (pain_level >= conds["pain_gte"]):
            met = False
        if "duration_days_gt" in conds:
            if symptom_duration is None or symptom_duration <= conds["duration_days_gt"]:
                met = False
                
        if met:
            weight = float(rule.get("score_modifier", 0))
            score_modifier += weight
            fired.append({
                "rule_id": rule.get("rule_id"),
                "label": rule.get("label"),
                "score": weight,
                "conditions_met": ["risk_weight_match"]
            })
            labels.append(rule.get("label"))
            
    new_score = max(0.0, min(100.0, current_score + score_modifier))
    return new_score, fired, labels

def apply_business_rules(
    base_priority: str,
    structured_findings: dict[str, bool],
    pain_level: int,
    age: int,
    business_rules: list[dict]
) -> tuple[str, list[str]]:
    """Business Rules Override."""
    priorities = ["Low", "Medium", "High", "Critical"]
    
    def priority_val(p: str) -> int:
        if p in priorities:
            return priorities.index(p)
        return -1

    current_prio_idx = priority_val(base_priority)
    flags_fired = []
    
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
                if not structured_findings.get(s.lower(), False):
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

