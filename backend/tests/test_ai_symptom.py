import pytest
from unittest.mock import patch, Mock
from aarogyaq.ai_symptom import map_symptoms, VALID_CLINICAL_TERMS
import requests

def test_deterministic_chest_pain():
    # use_ai=False, input "chest pain and breathlessness":
    mapped, scores, flagged = map_symptoms("chest pain and breathlessness", use_ai=False)
    assert "chest_pain" in mapped
    assert "difficulty_breathing" in mapped

def test_deterministic_sugar():
    # use_ai=False, input "sugar patient with chest tightness":
    mapped, scores, flagged = map_symptoms("sugar patient with chest tightness", use_ai=False)
    assert "diabetes_history" in mapped
    assert "chest_pain" in mapped

def test_deterministic_unrelated():
    # use_ai=False, input "completely unrelated random words xyz123":
    mapped, scores, flagged = map_symptoms("completely unrelated random words xyz123", use_ai=False)
    assert mapped == []

@patch("aarogyaq.ai_symptom.requests.post")
def test_use_ai_mock_success(mock_post):
    # use_ai=True: MOCK the Ollama HTTP call
    mock_response = Mock()
    mock_response.json.return_value = {
        "response": '{"mapped_terms": ["head_injury", "fake_term"], "confidence": {"head_injury": 0.95, "fake_term": 0.9}}'
    }
    mock_response.raise_for_status = Mock()
    mock_post.return_value = mock_response

    mapped, scores, flagged = map_symptoms("I hit my head", use_ai=True)
    
    assert "head_injury" in mapped
    assert "fake_term" not in mapped  # Hallucination guard filtering
    assert scores["head_injury"] == 0.95
    assert not flagged

@patch("aarogyaq.ai_symptom.requests.post")
def test_use_ai_mock_fallback(mock_post):
    # use_ai=True: MOCK Ollama to raise ConnectionError.
    mock_post.side_effect = requests.ConnectionError("Failed to connect")
    
    # Should fall back to keyword matching without raising exception
    mapped, scores, flagged = map_symptoms("sugar patient", use_ai=True)
    assert "diabetes_history" in mapped
    assert scores["diabetes_history"] == 1.0
