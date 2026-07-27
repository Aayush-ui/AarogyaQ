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
import logging

logger = logging.getLogger(__name__)

BUSINESS_FLAG_EXPLANATIONS: dict[str, str] = {
    "ELDERLY_CARDIAC_CRITICAL": "Critical prioritization override: Patient is over 70 presenting with chest pain, suggesting high cardiac risk.",
    "PEDIATRIC_NEURO_CRITICAL": "Critical prioritization override: Pediatric patient (under 5) with loss of consciousness, indicating potential neuro crisis.",
    "MAX_PAIN_OVERRIDE": "High prioritization override: Patient reports maximum pain level (10/10).",
    "PREGNANCY_HIGH_RISK": "High prioritization override: Pregnant patient with moderate-to-severe pain level (6/10 or higher).",
    "ANAPHYLAXIS_IMMEDIATE": "Critical prioritization override: Patient presenting with severe allergic reaction / anaphylaxis symptoms.",
}

def generate_summary(
    patient_name: str,
    age: int,
    gender: str,
    chief_complaint: str,
    mapped_symptoms: list[str],
    pain_level: int,
    existing_conditions: list[str],
    priority_level: str,
    contributing_factors: list[str],
    department_assigned: str,
    use_ai: bool = False,
    business_flags: list[str] | None = None
) -> str:
    """Generate a professional doctor-facing summary paragraph.

    Args:
        patient_name: The patient's full name.
        age: The patient's age in years.
        gender: The patient's gender.
        chief_complaint: The chief complaint string.
        mapped_symptoms: List of mapped symptoms.
        pain_level: Pain level on a 0-10 scale.
        existing_conditions: List of existing chronic conditions.
        priority_level: Assigned priority level (Critical/High/Medium/Low).
        contributing_factors: List of risk factors contributing to the score.
        department_assigned: Assigned clinical department name.
        use_ai: Whether to rephrase using LLM. Defaults to False.
        business_flags: Optional list of triggered business override flags.

    Returns:
        A clinician-facing summary narrative string.
    """
    mapped_str = ", ".join(mapped_symptoms) if mapped_symptoms else "None identified"
    cond_str = ", ".join(existing_conditions) if existing_conditions else "None reported"
    factors_str = ", ".join(contributing_factors) if contributing_factors else "None"
    
    # Resolve business flags to human-readable explanations
    business_explanations = []
    if business_flags:
        for flag in business_flags:
            if flag in BUSINESS_FLAG_EXPLANATIONS:
                business_explanations.append(BUSINESS_FLAG_EXPLANATIONS[flag])
            else:
                business_explanations.append(f"Override: {flag}")
    
    business_str = "; ".join(business_explanations) if business_explanations else "None"
    
    template = (
        f"PATIENT: {patient_name}, {age}yr {gender}\n"
        f"CHIEF COMPLAINT: {chief_complaint}\n"
        f"CLINICAL FINDINGS: {mapped_str}\n"
        f"PAIN LEVEL: {pain_level}/10\n"
        f"EXISTING CONDITIONS: {cond_str}\n"
        f"TRIAGE PRIORITY: {priority_level}\n"
        f"RISK CONTRIBUTORS: {factors_str}\n"
        f"BUSINESS OVERRIDES: {business_str}\n"
        f"ROUTING: {department_assigned}"
    )

    if use_ai:
        prompt = (
            f"SYSTEM: You are a clinical documentation assistant in a hospital "
            f"emergency department. Write exactly one professional paragraph "
            f"(3-5 sentences) suitable for a doctor to read in 5 seconds. "
            f"Use formal clinical language. Do NOT diagnose. Do NOT suggest "
            f"treatment. Only summarize the provided facts.\n"
            f"Respond with ONLY the paragraph text. No JSON. No formatting.\n"
            f"USER: Patient: {patient_name}, Age: {age}, Gender: {gender}\n"
            f"Chief complaint: {chief_complaint}\n"
            f"Identified clinical markers: {mapped_str}\n"
            f"Pain: {pain_level}/10\n"
            f"Known conditions: {cond_str}\n"
            f"Triage priority: {priority_level}\n"
            f"Risk factors identified: {factors_str}\n"
            f"Business overrides: {business_str}\n"
            f"Assigned department: {department_assigned}"
        )
        try:
            resp = requests.post("http://localhost:11434/api/generate", json={
                "model": "llama3.1:8b",
                "prompt": prompt,
                "stream": False
            }, timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                if "response" in data and data["response"].strip():
                    return data["response"].strip()
        except Exception as e:
            logger.warning(f"Ollama call failed: {e}. Falling back to template.")

    return template

