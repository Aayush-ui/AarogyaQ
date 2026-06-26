import pytest
from unittest.mock import patch
from aarogyaq.summary_gen import generate_summary
import requests

def test_summary_deterministic_template():
    # use_ai=False: verify deterministic template includes patient_name, priority_level, and department_assigned
    summary = generate_summary(
        "John Doe", 30, "Male", "Chest pain", ["chest_pain"], 8, ["hypertension"], "Critical", ["pain_level >= 8"], "Emergency"
    )
    assert "John Doe" in summary
    assert "Critical" in summary
    assert "Emergency" in summary

def test_summary_deterministic_no_symptoms():
    # use_ai=False, no symptoms: assert "None identified" in output.
    summary = generate_summary(
        "Jane Doe", 25, "Female", "Unknown", [], 1, [], "Low", [], "General OPD"
    )
    assert "None identified" in summary

@patch("requests.post")
def test_summary_ai_success(mock_post):
    # use_ai=True: MOCK Ollama to return a text response. Assert the mock text is returned.
    class MockResponse:
        status_code = 200
        def json(self):
            return {"response": "This is a mock AI summary."}
            
    mock_post.return_value = MockResponse()
    
    summary = generate_summary(
        "John", 40, "Male", "Pain", ["chest_pain"], 8, [], "High", [], "Cardiology", use_ai=True
    )
    assert summary == "This is a mock AI summary."

@patch("requests.post")
def test_summary_ai_fallback(mock_post):
    # use_ai=True: MOCK Ollama to raise ConnectionError. Assert deterministic template returned.
    mock_post.side_effect = requests.exceptions.ConnectionError()
    
    summary = generate_summary(
        "Alice", 50, "Female", "Pain", [], 5, [], "Medium", [], "General OPD", use_ai=True
    )
    assert "Alice" in summary
    assert "Medium" in summary
    assert "General OPD" in summary
