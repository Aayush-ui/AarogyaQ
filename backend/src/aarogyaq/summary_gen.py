"""
Single responsibility: generate the clinician-facing narrative summary for a
triage assessment, optionally rephrased by the Ollama LLM.

OLLAMA ISOLATION RULE: this is one of exactly two modules allowed to make
LLM/network calls (the other is :mod:`aarogyaq.ai_symptom`).  All network
activity is gated behind the ``use_ai`` flag.  When ``use_ai=False`` (the
default) or when Ollama is unreachable the function falls back silently to a
deterministic template.
"""
from __future__ import annotations


import requests

def generate_summary(
    patient_name: str,
    age: int,
    gender: str,
    chief_complaint: str,
    pain_level: int,
    symptom_duration: int | None,
    existing_conditions: list[str],
    mapped_symptoms: list[str],
    risk_score: float,
    priority_level: str,
    contributing_factors: list[str],
    business_rule_flags: list[str],
    use_ai: bool = False,
) -> str:
    """Produce a plain-language triage summary for the attending clinician."""
    if not patient_name.strip() or not gender.strip() or not chief_complaint.strip() or not priority_level.strip():
        raise ValueError("Required string arguments cannot be empty.")

    duration_str = f" for {symptom_duration} minutes" if symptom_duration is not None else ""
    cond_str = f" with history of {', '.join(existing_conditions)}" if existing_conditions else " with no known prior conditions"
    factors_str = f" Key factors: {', '.join(contributing_factors)}." if contributing_factors else ""
    flags_str = f" Rules applied: {', '.join(business_rule_flags)}." if business_rule_flags else ""

    template = (
        f"{patient_name}, a {age}-year-old {gender}, presented with {chief_complaint}{duration_str}{cond_str}. "
        f"Pain is {pain_level}/10. Mapped symptoms: {', '.join(mapped_symptoms)}. "
        f"Calculated risk score is {risk_score} (Priority: {priority_level}).{factors_str}{flags_str}"
    )

    if use_ai:
        try:
            resp = requests.post("http://localhost:11434/api/generate", json={
                "model": "llama3.2:1b",
                "prompt": f"Rewrite the following clinical triage summary to be professional, concise, and clear. Do not add any new medical information or change the meaning. Only return the rewritten text:\n\n{template}",
                "stream": False
            }, timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                if "response" in data and data["response"].strip():
                    return data["response"].strip()
        except Exception:
            pass
            
    return template
