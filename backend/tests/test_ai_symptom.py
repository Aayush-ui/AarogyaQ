"""Tests for aarogyaq.ai_symptom — symptom mapping with and without AI."""
from __future__ import annotations

import pytest

from aarogyaq.ai_symptom import SymptomMappingResult, map_symptoms


def test_map_symptoms_deterministic_valid_case():
    """map_symptoms with use_ai=False returns a SymptomMappingResult for valid input."""
    res = map_symptoms("Patient has chest pain and fever", use_ai=False)
    assert isinstance(res, SymptomMappingResult)
    assert "Chest Pain" in res.mapped_symptoms
    assert "Fever" in res.mapped_symptoms
    assert not res.used_ai


def test_map_symptoms_empty_text_invalid_case():
    """map_symptoms raises ValueError for empty or whitespace-only input."""
    with pytest.raises(ValueError):
        map_symptoms("")
    with pytest.raises(ValueError):
        map_symptoms("   ")


def test_map_symptoms_same_input_identical_output_edge():
    """map_symptoms(use_ai=False) produces byte-identical output for identical input."""
    res1 = map_symptoms("I have a headache")
    res2 = map_symptoms("I have a headache")
    assert res1 == res2
