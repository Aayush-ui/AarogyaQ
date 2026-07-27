from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging

from aarogyaq.models import Visit, Assessment, DoctorSummary
from aarogyaq.patient_intake import get_patient
from aarogyaq.ai_symptom import map_symptoms
from aarogyaq.rule_engine import load_clinical_rules, load_business_rules, evaluate_rules, apply_business_rules
from aarogyaq.priority import classify
from aarogyaq.queue_manager import assign_queue
from aarogyaq.department import route_department
from aarogyaq.summary_gen import generate_summary
from aarogyaq.audit import write_log

logger = logging.getLogger(__name__)

def assess_patient(db: Session, visit_id: int, use_ai: bool = False, symptoms: list[str] | None = None) -> dict:
    # 1. Load visit from DB
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise ValueError(f"Visit {visit_id} not found")
        
    patient = get_patient(db, visit.patient_id)
    
    # 2. Map symptoms — prefer explicit symptoms list from the request; fall back to chief_complaint
    symptom_text = ", ".join(symptoms) if symptoms else visit.chief_complaint
    structured_findings, confidence_scores, flagged_terms = map_symptoms(symptom_text, use_ai=use_ai)
    mapped_symptoms = [k for k, v in structured_findings.items() if v]
    
    # 3. Evaluate clinical rules (Layer 1, 2, 3)
    from aarogyaq.models import to_list
    existing_conditions = to_list(visit.existing_conditions)
    clinical_rules = load_clinical_rules()
    
    # NEW Layer 1: Red Flags (Wait, I need to add load_red_flag_rules and load_risk_weights to rule_engine)
    from aarogyaq.rule_engine import load_red_flag_rules, load_risk_weights, evaluate_red_flags, evaluate_risk_weights
    red_flag_rules = load_red_flag_rules()
    risk_weights = load_risk_weights()
    
    red_flag_fired, red_flag_factors = evaluate_red_flags(structured_findings, red_flag_rules)
    
    if red_flag_fired:
        risk_score = 100.0
        fired_rules = red_flag_factors
        contributing_factors = [f["label"] for f in red_flag_factors]
        base_priority = "Critical"
    else:
        risk_score, fired_rules, contributing_factors = evaluate_rules(
            structured_findings, visit.pain_level, patient.age, existing_conditions, clinical_rules
        )
        
        # Layer 3: Risk weights
        risk_score, weight_factors, weight_labels = evaluate_risk_weights(
            risk_score, structured_findings, visit.pain_level, patient.age, existing_conditions, visit.symptom_duration, risk_weights
        )
        fired_rules.extend(weight_factors)
        contributing_factors.extend(weight_labels)
        
        # 4. Classify priority
        base_priority = classify(risk_score)
    
    # 5. Apply business rules
    business_rules = load_business_rules()
    final_priority, business_flags = apply_business_rules(
        base_priority, structured_findings, visit.pain_level, patient.age, business_rules
    )
    
    if final_priority != base_priority:
        write_log(db, visit_id=visit_id, actor="system", action="PRIORITY_CHANGED", notes=f"{base_priority} -> {final_priority}")
        
    for rule in fired_rules:
        write_log(db, visit_id=visit_id, actor="system", action="RULE_FIRED", notes=f"Rule: {rule['rule_id']}")
        
    # 6. Assign queue
    try:
        queue_type = assign_queue(db, visit_id, final_priority)
    except Exception as exc:
        logger.error("assign_queue failed for visit %s: %s", visit_id, exc, exc_info=True)
        raise
    
    # 7. Route department
    try:
        dept_name, dept_status = route_department(mapped_symptoms, final_priority, patient.age, db)
    except Exception as exc:
        logger.error("route_department failed for visit %s: %s", visit_id, exc, exc_info=True)
        raise
    visit.department_assigned = dept_name
    db.flush()
    
    # 8. Generate summary
    summary_text = generate_summary(
        patient_name=patient.name,
        age=patient.age,
        gender=patient.gender,
        chief_complaint=visit.chief_complaint,
        mapped_symptoms=mapped_symptoms,
        pain_level=visit.pain_level,
        existing_conditions=existing_conditions,
        priority_level=final_priority,
        contributing_factors=contributing_factors,
        department_assigned=dept_name,
        use_ai=use_ai,
        business_flags=business_flags
    )
    
    # 9. Persist Assessment
    assessment = Assessment(
        visit_id=visit_id,
        raw_symptoms=visit.chief_complaint,
        mapped_symptoms=json.dumps(mapped_symptoms),
        confidence_scores=json.dumps(confidence_scores),
        priority_level=final_priority,
        risk_score=risk_score,
        score_breakdown=json.dumps(fired_rules),
        contributing_factors=json.dumps(contributing_factors),
        business_rule_flags=json.dumps(business_flags),
        is_reassessment=False
    )
    db.add(assessment)
    db.flush()
    
    # 10. Persist DoctorSummary
    summary = db.query(DoctorSummary).filter(DoctorSummary.visit_id == visit_id).first()
    if summary:
        summary.summary_text = summary_text
        summary.generated_at = datetime.utcnow()
    else:
        summary = DoctorSummary(
            visit_id=visit_id,
            summary_text=summary_text,
        )
        db.add(summary)
    db.flush()
    
    # 11. Write audit log
    write_log(db, visit_id=visit_id, actor="system", action="SUMMARY_GENERATED")
    
    from aarogyaq.priority import get_color
    return {
        "visit_id": visit_id,
        "patient_id": patient.patient_id,
        "patient_name": patient.name,
        "priority_level": final_priority,
        "risk_score": float(risk_score),
        "queue_type": queue_type,
        "department_assigned": dept_name,
        "department_status": dept_status,
        "mapped_symptoms": mapped_symptoms,
        "confidence_scores": confidence_scores,
        "flagged_low_confidence": flagged_terms,
        "contributing_factors": contributing_factors,
        "business_rule_flags": business_flags,
        "score_breakdown": fired_rules,
        "summary": summary_text,
        "priority_color": get_color(final_priority),
        "assessed_at": assessment.assessed_at.isoformat() if assessment.assessed_at else datetime.utcnow().isoformat()
    }

def reassess_patient(db: Session, visit_id: int, new_chief_complaint: str, new_pain_level: int, use_ai: bool = False) -> dict:
    visit = db.query(Visit).filter(Visit.visit_id == visit_id).first()
    if not visit:
        raise ValueError(f"Visit {visit_id} not found")
        
    visit.chief_complaint = new_chief_complaint
    visit.pain_level = new_pain_level
    db.flush()
    
    result = assess_patient(db, visit_id, use_ai)
    
    # Find the newly created assessment (it's the latest one)
    latest_assessment = max(visit.assessments, key=lambda a: a.assessment_id)
    latest_assessment.is_reassessment = True
    db.flush()
    
    write_log(db, visit_id=visit_id, actor="nurse", action="REASSESSED")
    
    return result

# --- Backward compatibility for api.py tests ---
def triage_new_visit(db: Session, patient_id: str, visit_data, use_ai: bool = False):
    from aarogyaq.models import TriageResult, PatientOut, VisitOut, AssessmentOut, SummaryOut
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
    
    res = assess_patient(db, visit.visit_id, use_ai)
    patient = get_patient(db, patient_id)
    
    assessment = max(visit.assessments, key=lambda a: a.assessment_id)
    summary = max(visit.doctor_summaries, key=lambda s: s.summary_id)
    
    return TriageResult(
        patient=PatientOut.model_validate(patient),
        visit=VisitOut.model_validate(visit),
        assessment=AssessmentOut.model_validate(assessment),
        summary=SummaryOut.model_validate(summary)
    )

def reassess_visit(db: Session, visit_id: int, new_complaint: str | None = None, use_ai: bool = False):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise KeyError(f"Visit {visit_id} not found")
    
    comp = new_complaint if new_complaint else visit.chief_complaint
    pain = visit.pain_level
    
    res = reassess_patient(db, visit_id, comp, pain, use_ai)
    
    from aarogyaq.models import TriageResult, PatientOut, VisitOut, AssessmentOut, SummaryOut
    patient = get_patient(db, visit.patient_id)
    assessment = max(visit.assessments, key=lambda a: a.assessment_id)
    summary = max(visit.doctor_summaries, key=lambda s: s.summary_id)
    
    return TriageResult(
        patient=PatientOut.model_validate(patient),
        visit=VisitOut.model_validate(visit),
        assessment=AssessmentOut.model_validate(assessment),
        summary=SummaryOut.model_validate(summary)
    )
