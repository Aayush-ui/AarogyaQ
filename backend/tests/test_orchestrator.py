"""Tests for aarogyaq.orchestrator — end-to-end triage workflow coordination."""
from __future__ import annotations

import pytest

from aarogyaq.orchestrator import reassess_visit, triage_new_visit


from aarogyaq.models import Patient, VisitCreate, Visit
from aarogyaq.models import TriageResult

def test_triage_new_visit_returns_triage_result_valid_case(test_db):
    """triage_new_visit returns a TriageResult for a valid patient and visit."""
    p = Patient(patient_id="ARQ-01", name="Z", age=40, gender="Male")
    test_db.add(p)
    test_db.flush()
    
    data = VisitCreate(
        patient_id="ARQ-01",
        chief_complaint="Chest pain",
        pain_level=8,
        symptom_duration=30,
        existing_conditions=["Hypertension"],
        queue_type="Emergency"
    )
    
    res = triage_new_visit(test_db, "ARQ-01", data)
    assert isinstance(res, TriageResult)
    assert res.patient.name == "Z"
    assert res.visit.chief_complaint == "Chest pain"
    assert res.assessment.priority_level in ["Critical", "High", "Medium", "Low"]
    assert "Chest pain" in res.summary.summary_text


def test_triage_new_visit_unknown_patient_invalid_case(test_db):
    """triage_new_visit raises KeyError when the patient does not exist."""
    data = VisitCreate(
        patient_id="ARQ-99",
        chief_complaint="Chest pain",
        pain_level=8,
        symptom_duration=30,
        existing_conditions=[],
        queue_type="Emergency"
    )
    with pytest.raises(KeyError):
        triage_new_visit(test_db, "ARQ-999", data)


def test_reassess_completed_visit_edge(test_db):
    """reassess_visit raises ValueError when the visit status is 'Completed'."""
    p = Patient(patient_id="ARQ-02", name="W", age=20, gender="Female")
    test_db.add(p)
    test_db.flush()
    
    v = Visit(patient_id="ARQ-02", chief_complaint="A", pain_level=1, queue_type="General", status="Completed")
    test_db.add(v)
    test_db.flush()
    
    with pytest.raises(ValueError, match="Cannot reassess a completed visit"):
        reassess_visit(test_db, v.visit_id, "B")
