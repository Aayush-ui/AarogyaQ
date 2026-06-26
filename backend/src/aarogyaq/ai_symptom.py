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

from functools import lru_cache
from pathlib import Path

@lru_cache(maxsize=1)
def load_symptom_dictionary(path: str = "backend/config/symptom_dictionary.json") -> dict:
    file_path = Path(path)
    if not file_path.exists():
        alt_path = Path(__file__).parent.parent.parent.parent / path
        if alt_path.exists():
            file_path = alt_path
        else:
            raise FileNotFoundError(f"Config not found at {path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    return {
        "valid_terms": frozenset(data.get("valid_terms", [])),
        "synonyms": data.get("synonyms", {})
    }

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.1:8b"
CONFIDENCE_THRESHOLD = 0.75

def map_symptoms(
    free_text: str,
    use_ai: bool = False
) -> tuple[dict[str, bool], dict[str, float], list[str]]:
    """
    Map nurse's free-text to standardized clinical terms.
    Returns:
    (structured_findings, confidence_scores, flagged_low_confidence)
    """
    config = load_symptom_dictionary()
    valid_terms = config["valid_terms"]
    synonym_map = config["synonyms"]

    if not free_text or not free_text.strip():
        return {t: False for t in valid_terms}, {}, []

    if use_ai:
        terms_csv = ", ".join(valid_terms)
        system_prompt = (
            "You are the core clinical NLP + triage reasoning engine for the AarogyaQ Emergency Triage System.\n"
            "Your job is NOT to answer like a chatbot.\n"
            "You must:\n"
            "1. Understand patient symptoms written in mixed informal English, Hinglish, and Gujarati (Gujarati written in Latin script).\n"
            "2. Normalize them into structured medical symptom concepts.\n"
            "3. Perform clinical triage reasoning using severity, urgency, and risk patterns.\n"
            "4. Output strictly structured JSON for backend processing.\n"
            "Return ONLY JSON, no explanation."
        )
        user_prompt = (
            f'Patient description: "{free_text}"\n'
            f'Map to terms from this list only:\n{terms_csv}\n\n'
            'Respond with ONLY this JSON structure:\n'
            '{\n'
            '  "normalized_symptoms": ["chest_pain", "difficulty_breathing"],\n'
            '  "confidence_scores": {"chest_pain": 0.95, "difficulty_breathing": 0.90},\n'
            '  "raw_interpretation": "User described symptoms in Hinglish/Gujarati mix...",\n'
            '  "priority_level": "HIGH",\n'
            '  "risk_score": 85,\n'
            '  "possible_conditions": ["cardiac_event", "respiratory_distress"],\n'
            '  "language_detected": "hinglish_gujarati_mix",\n'
            '  "flag_low_confidence": []\n'
            '}\n'
            'Rules:\n'
            '- You MUST only output the JSON. No other text.\n'
            '- Do not invent new symptom terms, use only the provided list for normalized_symptoms.\n'
        )

        for attempt in range(2):
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

                if "normalized_symptoms" not in parsed or not isinstance(parsed["normalized_symptoms"], list):
                    raise ValueError("Missing or invalid 'normalized_symptoms' list")
                    
                parsed_symptoms = parsed["normalized_symptoms"]
                findings = {t: (t in parsed_symptoms) for t in valid_terms}
                
                confidence_scores = {}
                flagged = parsed.get("flag_low_confidence", [])
                
                raw_conf = parsed.get("confidence_scores", {})
                for t in valid_terms:
                    if findings[t]:
                        c = float(raw_conf.get(t, 1.0))
                        confidence_scores[t] = c
                        if c < CONFIDENCE_THRESHOLD and t not in flagged:
                            flagged.append(t)

                return findings, confidence_scores, flagged

            except (requests.RequestException, json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Ollama call failed (attempt {attempt+1}): {e}")
                if attempt == 1:
                    logger.warning("Falling back to deterministic mapping.")
                pass

    # Deterministic fallback / default path
    mapped_terms_set = set()
    text_lower = free_text.lower()
    
    # Try exact word matches from valid terms
    for term in valid_terms:
        if term.replace("_", " ") in text_lower:
            mapped_terms_set.add(term)
            
    # Try synonym mapping
    for syn, canon in synonym_map.items():
        if syn in text_lower:
            if canon in valid_terms:
                mapped_terms_set.add(canon)

    findings = {t: (t in mapped_terms_set) for t in valid_terms}
    confidence_scores = {t: 1.0 for t in mapped_terms_set}
    flagged = []

    return findings, confidence_scores, flagged
