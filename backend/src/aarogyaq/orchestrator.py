"""
Single responsibility: coordinate the end-to-end triage workflow.

Calls ``patient_intake``, ``ai_symptom``, ``rule_engine``, ``summary_gen``,
and ``audit`` in the correct sequence so that API route handlers remain thin
and free of business logic.
"""
from __future__ import annotations

import json
from aarogyaq.models import Visit, Assessment, DoctorSummary
from aarogyaq.models import PatientOut, VisitOut, AssessmentOut, SummaryOut
from datetime import datetime
from typing import Any
from aarogyaq.ai_symptom import map_symptoms
from aarogyaq.audit import log_event
from aarogyaq.models import TriageResult, VisitCreate
from aarogyaq.patient_intake import get_patient
from aarogyaq.rule_engine import (
    load_clinical_rules, load_business_rules, evaluate_rules, apply_business_rules
)
from aarogyaq.summary_gen import generate_summary
from sqlalchemy.orm import Session

def triage_new_visit(
    db: Session,
    patient_id: str,
    visit_data: VisitCreate,
    use_ai: bool = False,
) -> TriageResult:
    patient = get_patient(db, patient_id)
    
    visit = Visit(
        patient_id=patient_id,
        chief_complaint=visit_data.chief_complaint,
        pain_level=visit_data.pain_level,
        symptom_duration=visit_data.symptom_duration,
        existing_conditions=json.dumps(visit_data.existing_conditions),
        queue_type=visit_data.queue_type,
        status="Waiting",
        visit_timestamp=datetime.utcnow()
    )
    db.add(visit)
    db.flush()
    
    mapped_symptoms, confidence_scores, flagged_low_confidence = map_symptoms(visit.chief_complaint, use_ai)
    
    clinical_rules = load_clinical_rules()
    business_rules = load_business_rules()
    
    score, fired_rules, factors = evaluate_rules(
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        age=patient.age,
        existing_conditions=visit_data.existing_conditions,
        rules=clinical_rules
    )
    
    from aarogyaq.priority import classify
    base_priority = classify(score)
            
    final_priority, b_flags = apply_business_rules(
        base_priority=base_priority,
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        age=patient.age,
        business_rules=business_rules
    )
    
    assessment = Assessment(
        visit_id=visit.visit_id,
        raw_symptoms=visit.chief_complaint,
        mapped_symptoms=json.dumps(mapped_symptoms),
        confidence_scores=json.dumps(confidence_scores),
        priority_level=final_priority,
        risk_score=score,
        score_breakdown=json.dumps(fired_rules),
        contributing_factors=json.dumps(factors),
        business_rule_flags=json.dumps(b_flags),
        is_reassessment=False
    )
    db.add(assessment)
    db.flush()
    
    from aarogyaq.queue_manager import assign_queue
    assign_queue(db, visit.visit_id, final_priority)
    
    from aarogyaq.department import route_department
    routed_dept, _ = route_department(
        mapped_symptoms=mapped_symptoms,
        priority_level=final_priority,
        age=patient.age,
        db=db
    )
    visit.department_assigned = routed_dept
    db.flush()
    
    summary_text = generate_summary(
        patient_name=patient.name,
        age=patient.age,
        gender=patient.gender,
        chief_complaint=visit.chief_complaint,
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        existing_conditions=visit_data.existing_conditions,
        priority_level=final_priority,
        contributing_factors=factors,
        department_assigned=routed_dept,
        use_ai=use_ai,
    )
    
    summary = DoctorSummary(
        visit_id=visit.visit_id,
        summary_text=summary_text,
    )
    db.add(summary)
    db.flush()
    
    log_event(db, actor="system", action="ASSESSED", visit_id=visit.visit_id, notes=f"Score: {score}")
    
    return TriageResult(
        patient=PatientOut(
            patient_id=patient.patient_id, name=patient.name, age=patient.age,
            gender=patient.gender, phone=patient.phone, created_at=patient.created_at
        ),
        visit=VisitOut(
            visit_id=visit.visit_id, patient_id=visit.patient_id, visit_timestamp=visit.visit_timestamp,
            chief_complaint=visit.chief_complaint, pain_level=visit.pain_level, symptom_duration=visit.symptom_duration,
            existing_conditions=visit_data.existing_conditions, queue_type=visit.queue_type,
            status=visit.status, department_assigned=visit.department_assigned,
            attended_at=visit.attended_at, completed_at=visit.completed_at
        ),
        assessment=AssessmentOut(
            assessment_id=assessment.assessment_id, visit_id=assessment.visit_id, raw_symptoms=assessment.raw_symptoms,
            mapped_symptoms=mapped_symptoms, confidence_scores=confidence_scores,
            risk_score=assessment.risk_score, priority_level=assessment.priority_level,
            score_breakdown=fired_rules, contributing_factors=factors,
            business_rule_flags=b_flags, assessed_at=assessment.assessed_at,
            is_reassessment=assessment.is_reassessment
        ),
        summary=SummaryOut(
            summary_id=summary.summary_id, visit_id=summary.visit_id, summary_text=summary.summary_text,
            generated_at=summary.generated_at
        )
    )

def reassess_visit(
    db: Session,
    visit_id: int,
    new_complaint: str | None = None,
    use_ai: bool = False,
) -> TriageResult:
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")
    if visit.status == "Completed":
        raise ValueError("Cannot reassess a completed visit")
        
    patient = get_patient(db, visit.patient_id)
    complaint = new_complaint if new_complaint is not None else visit.chief_complaint
    from aarogyaq.models import to_list
    existing_conditions = to_list(visit.existing_conditions)
    
    mapped_symptoms, confidence_scores, flagged_low_confidence = map_symptoms(complaint, use_ai)
    
    clinical_rules = load_clinical_rules()
    business_rules = load_business_rules()
    
    score, fired_rules, factors = evaluate_rules(
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        age=patient.age,
        existing_conditions=existing_conditions,
        rules=clinical_rules
    )
    
    from aarogyaq.priority import classify
    base_priority = classify(score)
            
    final_priority, b_flags = apply_business_rules(
        base_priority=base_priority,
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        age=patient.age,
        business_rules=business_rules
    )
    
    assessment = Assessment(
        visit_id=visit.visit_id,
        raw_symptoms=complaint,
        mapped_symptoms=json.dumps(mapped_symptoms),
        confidence_scores=json.dumps(confidence_scores),
        priority_level=final_priority,
        risk_score=score,
        score_breakdown=json.dumps(fired_rules),
        contributing_factors=json.dumps(factors),
        business_rule_flags=json.dumps(b_flags),
        is_reassessment=True
    )
    db.add(assessment)
    db.flush()
    
    from aarogyaq.queue_manager import assign_queue
    assign_queue(db, visit.visit_id, final_priority)
    
    from aarogyaq.department import route_department
    routed_dept, _ = route_department(
        mapped_symptoms=mapped_symptoms,
        priority_level=final_priority,
        age=patient.age,
        db=db
    )
    visit.department_assigned = routed_dept
    db.flush()
    
    summary_text = generate_summary(
        patient_name=patient.name,
        age=patient.age,
        gender=patient.gender,
        chief_complaint=complaint,
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        existing_conditions=existing_conditions,
        priority_level=final_priority,
        contributing_factors=factors,
        department_assigned=routed_dept,
        use_ai=use_ai,
    )
    
    summary = db.query(DoctorSummary).filter(DoctorSummary.visit_id == visit.visit_id).first()
    if summary:
        summary.summary_text = summary_text
        summary.generated_at = datetime.utcnow()
    else:
        summary = DoctorSummary(
            visit_id=visit.visit_id,
            summary_text=summary_text,
        )
        db.add(summary)
    
    db.flush()
    log_event(db, actor="system", action="REASSESSED", visit_id=visit.visit_id, notes=f"Score: {score}")
    
    return TriageResult(
        patient=PatientOut(
            patient_id=patient.patient_id, name=patient.name, age=patient.age,
            gender=patient.gender, phone=patient.phone, created_at=patient.created_at
        ),
        visit=VisitOut(
            visit_id=visit.visit_id, patient_id=visit.patient_id, visit_timestamp=visit.visit_timestamp,
            chief_complaint=visit.chief_complaint, pain_level=visit.pain_level, symptom_duration=visit.symptom_duration,
            existing_conditions=existing_conditions, queue_type=visit.queue_type,
            status=visit.status, department_assigned=visit.department_assigned,
            attended_at=visit.attended_at, completed_at=visit.completed_at
        ),
        assessment=AssessmentOut(
            assessment_id=assessment.assessment_id, visit_id=assessment.visit_id, raw_symptoms=assessment.raw_symptoms,
            mapped_symptoms=mapped_symptoms, confidence_scores=confidence_scores,
            risk_score=assessment.risk_score, priority_level=assessment.priority_level,
            score_breakdown=fired_rules, contributing_factors=factors,
            business_rule_flags=b_flags, assessed_at=assessment.assessed_at,
            is_reassessment=assessment.is_reassessment
        ),
        summary=SummaryOut(
            summary_id=summary.summary_id, visit_id=summary.visit_id, summary_text=summary.summary_text,
            generated_at=summary.generated_at
        )
    )
