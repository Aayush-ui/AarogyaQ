import pytest
from aarogyaq.rule_engine import load_clinical_rules, load_business_rules, evaluate_rules, apply_business_rules

@pytest.fixture
def clinical_rules():
    return load_clinical_rules()

@pytest.fixture
def business_rules():
    return load_business_rules()

def test_rule_001_cardiac_respiratory(clinical_rules):
    # chest_pain + difficulty_breathing + age=35 + pain_level=7
    score, fired, factors = evaluate_rules(
        mapped_symptoms=["chest_pain", "difficulty_breathing"],
        pain_level=7,
        age=35,
        existing_conditions=[],
        rules=clinical_rules
    )
    
    # RULE-001 requires chest_pain AND difficulty_breathing (45 pts)
    # RULE-005 requires chest_pain (OR) (25 pts)
    # RULE-006 requires difficulty_breathing (OR) (20 pts)
    assert score >= 45
    assert "Cardiac-Respiratory Emergency" in factors
    assert any(r["rule_id"] == "RULE-001" for r in fired)

def test_rule_003_neuro_emergency(clinical_rules):
    # loss_of_consciousness alone
    score, fired, factors = evaluate_rules(
        mapped_symptoms=["loss_of_consciousness"],
        pain_level=1,
        age=30,
        existing_conditions=[],
        rules=clinical_rules
    )
    
    assert score >= 50
    assert any(r["rule_id"] == "RULE-003" for r in fired)

def test_low_acuity_no_rules_fired(clinical_rules):
    # Low-acuity patient
    score, fired, factors = evaluate_rules(
        mapped_symptoms=["headache"],
        pain_level=3,
        age=30,
        existing_conditions=[],
        rules=clinical_rules
    )
    
    assert score == 0
    assert len(fired) == 0
    assert len(factors) == 0

def test_max_pain_override(clinical_rules, business_rules):
    # pain_level=10: RULE-004 fires + MAX_PAIN_OVERRIDE fires
    score, fired, factors = evaluate_rules(
        mapped_symptoms=["headache"],
        pain_level=10,
        age=30,
        existing_conditions=[],
        rules=clinical_rules
    )
    
    assert any(r["rule_id"] == "RULE-004" for r in fired)
    
    base_priority = "Low"
    final_priority, b_flags = apply_business_rules(
        base_priority=base_priority,
        mapped_symptoms=["headache"],
        pain_level=10,
        age=30,
        business_rules=business_rules
    )
    assert "MAX_PAIN_OVERRIDE" in b_flags
    # minimum priority is High
    assert final_priority in ["High", "Critical"]

def test_elderly_cardiac(clinical_rules, business_rules):
    # age=75 + chest_pain
    score, fired, factors = evaluate_rules(
        mapped_symptoms=["chest_pain"],
        pain_level=5,
        age=75,
        existing_conditions=[],
        rules=clinical_rules
    )
    
    assert any(r["rule_id"] == "RULE-015" for r in fired)
    
    base_priority = "Low"
    final_priority, b_flags = apply_business_rules(
        base_priority=base_priority,
        mapped_symptoms=["chest_pain"],
        pain_level=5,
        age=75,
        business_rules=business_rules
    )
    assert "ELDERLY_CARDIAC_CRITICAL" in b_flags
    assert final_priority == "Critical"

def test_determinism(clinical_rules):
    # Same call twice returns byte-identical output
    out1 = evaluate_rules(
        mapped_symptoms=["chest_pain", "difficulty_breathing"],
        pain_level=8,
        age=60,
        existing_conditions=["diabetes_history"],
        rules=clinical_rules
    )
    
    out2 = evaluate_rules(
        mapped_symptoms=["chest_pain", "difficulty_breathing"],
        pain_level=8,
        age=60,
        existing_conditions=["diabetes_history"],
        rules=clinical_rules
    )
    
    import json
    assert json.dumps(out1, sort_keys=True) == json.dumps(out2, sort_keys=True)
