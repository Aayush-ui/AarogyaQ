"""
Single responsibility: map free-text symptom descriptions to canonical clinical
terms, optionally using the Ollama LLM.

OLLAMA ISOLATION RULE: this is one of exactly two modules allowed to make
LLM/network calls (the other is :mod:`aarogyaq.summary_gen`).  All network
activity is gated behind the ``use_ai`` flag.  When ``use_ai=False`` (the
default) or when Ollama is unreachable the function falls back silently to a
deterministic keyword-matching strategy with zero network calls.
"""
from __future__ import annotations

import json
import logging
import requests

logger = logging.getLogger(__name__)

VALID_CLINICAL_TERMS = frozenset([
    "chest_pain", "difficulty_breathing", "loss_of_consciousness",
    "seizure", "stroke_symptoms", "high_fever", "altered_mental_status",
    "head_injury", "bleeding_uncontrolled", "allergic_reaction_severe",
    "abdominal_pain", "vomiting", "dehydration_signs", "pregnancy",
    "diabetes_history", "heart_disease_history", "hypertension_history",
    "pain_level_high", "dizziness", "fainting", "back_pain", "joint_pain",
    "skin_rash", "eye_irritation", "ear_pain", "sore_throat", "cough",
    "cold_symptoms", "urinary_symptoms", "weakness_general"
])

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.1:8b"
CONFIDENCE_THRESHOLD = 0.75

SYNONYM_MAP = {
    "chest tightness": "chest_pain",
    "can't breathe": "difficulty_breathing",
    "unconscious": "loss_of_consciousness",
    "sugar": "diabetes_history",
    "fit": "seizure",
    "fits": "seizure",
    "fainted": "fainting",
    "breathless": "difficulty_breathing",
    "bp": "hypertension_history",
    "heart attack": "chest_pain",
    "stomach ache": "abdominal_pain",
    "throwing up": "vomiting",
    "puking": "vomiting",
    "dry mouth": "dehydration_signs",
    "expecting": "pregnancy",
    "pregnant": "pregnancy",
    "high blood pressure": "hypertension_history",
    "dizzy": "dizziness",
    "passed out": "fainting",
    "rash": "skin_rash",
    "itchy skin": "skin_rash",
    "sore eyes": "eye_irritation",
    "red eyes": "eye_irritation",
    "earache": "ear_pain",
    "throat hurts": "sore_throat",
    "coughing": "cough",
    "runny nose": "cold_symptoms",
    "pee hurts": "urinary_symptoms",
    "weak": "weakness_general",
    "tired": "weakness_general",
    "exhausted": "weakness_general",
    "fever": "high_fever",
    "hot": "high_fever",
    "head hurt": "head_injury",
    "bleeding": "bleeding_uncontrolled",
    "allergy": "allergic_reaction_severe",
    "swollen": "allergic_reaction_severe",
    "seizures": "seizure"
}

def map_symptoms(
    free_text: str,
    use_ai: bool = False
) -> tuple[list[str], dict[str, float], list[str]]:
    """
    Map nurse's free-text to standardized clinical terms.
    Returns:
    (mapped_terms, confidence_scores, flagged_low_confidence)
    """
    if not free_text or not free_text.strip():
        return [], {}, []

    if use_ai:
        terms_csv = ", ".join(VALID_CLINICAL_TERMS)
        system_prompt = (
            "You are a clinical triage assistant. Your only job is "
            "to map patient symptom descriptions to standardized clinical "
            "terms from a fixed list. Respond ONLY with a valid JSON object. "
            "No preamble. No explanation. No markdown. Just the JSON."
        )
        user_prompt = (
            f'Patient description: "{free_text}"\n'
            f'Map to terms from this list only:\n{terms_csv}\n'
            'Respond with ONLY this JSON structure:\n'
            '{\n'
            '  "mapped_terms": ["term1", "term2"],\n'
            '  "confidence": {"term1": 0.9, "term2": 0.85}\n'
            '}\n'
            'Rules:\n'
            '- Only include terms from the list above.\n'
            '- Do not invent new terms.\n'
            '- If no terms match, return {"mapped_terms": [], "confidence": {}}'
        )

        try:
            response = requests.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{system_prompt}\n{user_prompt}",
                    "stream": False,
                    "format": "json"
                },
                timeout=5
            )
            response.raise_for_status()
            data = response.json()
            raw_response = data.get("response", "{}")
            parsed = json.loads(raw_response)

            mapped_terms = [t for t in parsed.get("mapped_terms", []) if t in VALID_CLINICAL_TERMS]
            confidence_scores = {}
            flagged = []
            
            raw_conf = parsed.get("confidence", {})
            for t in mapped_terms:
                c = float(raw_conf.get(t, 1.0))
                confidence_scores[t] = c
                if c < CONFIDENCE_THRESHOLD:
                    flagged.append(t)

            return mapped_terms, confidence_scores, flagged

        except (requests.RequestException, json.JSONDecodeError) as e:
            logger.warning(f"Ollama call failed: {e}. Falling back to deterministic mapping.")
            # Fall through to deterministic mapping
            pass

    # Deterministic fallback / default path
    mapped_terms_set = set()
    text_lower = free_text.lower()
    
    # Try exact word matches from valid terms
    for term in VALID_CLINICAL_TERMS:
        if term.replace("_", " ") in text_lower:
            mapped_terms_set.add(term)
            
    # Try synonym mapping
    for syn, canon in SYNONYM_MAP.items():
        if syn in text_lower:
            if canon in VALID_CLINICAL_TERMS:
                mapped_terms_set.add(canon)

    mapped_terms = list(mapped_terms_set)
    confidence_scores = {t: 1.0 for t in mapped_terms}
    flagged = []

    return mapped_terms, confidence_scores, flagged
