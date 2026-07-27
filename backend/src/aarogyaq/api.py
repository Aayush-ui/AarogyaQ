from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import json

from aarogyaq.database import get_db
from aarogyaq.models import VisitOut, AssessmentOut, DepartmentOut, Visit, Department, Patient, ClinicalNote, MedicationOrder, LabOrder, RadiologyOrder
from aarogyaq.patient_intake import register_patient
from aarogyaq.orchestrator import assess_patient, reassess_patient
from aarogyaq.queue_manager import get_emergency_queue, get_general_queue, get_stale_patients, update_visit_status
from aarogyaq.digital_twin import compute_twin_state, TwinState
from aarogyaq.rl_agent import (
    load_agent, save_agent, make_state_key, select_action,
    compute_reward, update_qtable, apply_threshold_offset,
    get_adjusted_thresholds, ACTIONS,
)

from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

app = FastAPI(title="AarogyaQ API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    from aarogyaq.database import init_db, seed_departments
    init_db()
    seed_departments()

router = APIRouter()

# Exception Handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    # Map ValueErrors to 422 if it's about invalid range or unknown ID
    return JSONResponse(status_code=422, content={"detail": str(exc)})

@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# Request Models
class VitalsPayload(BaseModel):
    heart_rate: Optional[int] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    respiratory_rate: Optional[int] = None
    spo2: Optional[int] = None
    temperature: Optional[float] = None

class RegisterRequest(BaseModel):
    name: str
    age: int
    gender: str
    phone: Optional[str] = None
    chief_complaint: str
    pain_level: int
    symptom_duration: Optional[int] = None
    symptoms: List[str] = []                   # current presenting symptoms (used by AI mapper)
    existing_conditions: List[str] = []        # pre-existing medical history (e.g. Diabetes, Hypertension)
    vitals: Optional[VitalsPayload] = None
    use_ai: bool = False

class ReassessRequest(BaseModel):
    chief_complaint: str
    pain_level: int
    use_ai: bool = False

class VisitStatusPatch(BaseModel):
    status: str
    actor: str

class DeptStatusPatch(BaseModel):
    status: str

class ClinicalNoteRequest(BaseModel):
    author: str
    note: str

class MedicationOrderRequest(BaseModel):
    doctor: str
    name: str
    dosage: str
    frequency: str

class LabOrderRequest(BaseModel):
    doctor: str
    test_name: str

class RadiologyOrderRequest(BaseModel):
    doctor: str
    scan_type: str

class BedAssignmentPatch(BaseModel):
    bed: str

class DepartmentTransferPatch(BaseModel):
    department: str

class RLFeedbackRequest(BaseModel):
    """Manual RL feedback payload (auto-triggered on visit completion)."""
    visit_id:          int
    priority_level:    str
    queue_type:        str
    minutes_to_attend: int
    queue_depth:       int = 0

class BusinessOverrideExplanation(BaseModel):
    flag: str
    explanation: str

class ExplanationResponse(BaseModel):
    rule_breakdown: List[dict]
    business_overrides: List[BusinessOverrideExplanation]
    twin_alert_reasons: List[str]
    rl_threshold_at_time: dict[str, List[float]]

# ── Helpers ──────────────────────────────────────────────────────────────────

def visit_to_dict(v: Visit) -> dict:
    res = {
        "visit_id": v.visit_id,
        "patient_id": v.patient_id,
        "visit_timestamp": v.visit_timestamp,
        "chief_complaint": v.chief_complaint,
        "pain_level": v.pain_level,
        "symptom_duration": v.symptom_duration,
        "existing_conditions": json.loads(v.existing_conditions) if v.existing_conditions else [],
        "queue_type": v.queue_type,
        "status": v.status,
        "department_assigned": v.department_assigned,
        "bed_assigned": getattr(v, "bed_assigned", None),
        "needs_reassessment": getattr(v, "needs_reassessment", False),
        "attended_at": v.attended_at,
        "completed_at": v.completed_at,
        "clinical_notes": [],
        "medication_orders": [],
        "laboratory_orders": [],
        "radiology_orders": []
    }
    if getattr(v, "vitals", None):
        res["vitals"] = {
            "vital_id": v.vitals.vital_id,
            "heart_rate": v.vitals.heart_rate,
            "systolic_bp": v.vitals.systolic_bp,
            "diastolic_bp": v.vitals.diastolic_bp,
            "respiratory_rate": v.vitals.respiratory_rate,
            "spo2": v.vitals.spo2,
            "temperature": v.vitals.temperature,
            "logged_at": v.vitals.logged_at
        }
    if getattr(v, "clinical_notes", None):
        res["clinical_notes"] = [{"note_id": n.note_id, "author": n.author, "note": n.note, "timestamp": n.timestamp} for n in v.clinical_notes]
    if getattr(v, "medication_orders", None):
        res["medication_orders"] = [{"order_id": m.order_id, "doctor": m.doctor, "name": m.name, "dosage": m.dosage, "frequency": m.frequency, "status": m.status, "timestamp": m.timestamp} for m in v.medication_orders]
    if getattr(v, "laboratory_orders", None):
        res["laboratory_orders"] = [{"order_id": l.order_id, "doctor": l.doctor, "test_name": l.test_name, "status": l.status, "result": l.result, "timestamp": l.timestamp} for l in v.laboratory_orders]
    if getattr(v, "radiology_orders", None):
        res["radiology_orders"] = [{"order_id": r.order_id, "doctor": r.doctor, "scan_type": r.scan_type, "status": r.status, "result": r.result, "timestamp": r.timestamp} for r in v.radiology_orders]
    return res

def assessment_to_dict(a) -> dict:
    return {
        "assessment_id": a.assessment_id,
        "visit_id": a.visit_id,
        "raw_symptoms": a.raw_symptoms,
        "mapped_symptoms": json.loads(a.mapped_symptoms) if a.mapped_symptoms else [],
        "confidence_scores": json.loads(a.confidence_scores) if a.confidence_scores else {},
        "risk_score": a.risk_score,
        "priority_level": a.priority_level,
        "score_breakdown": json.loads(a.score_breakdown) if a.score_breakdown else [],
        "contributing_factors": json.loads(a.contributing_factors) if a.contributing_factors else [],
        "business_rule_flags": json.loads(a.business_rule_flags) if a.business_rule_flags else [],
        "assessed_at": a.assessed_at,
        "is_reassessment": a.is_reassessment
    }


def twin_for_visit(v: Visit, assessment) -> dict | None:
    """Compute Digital Twin state for a visit+assessment pair.

    Returns a serialisable dict, or None if there is no assessment yet.
    """
    if assessment is None:
        return None
    try:
        vitals_dict = None
        if getattr(v, "vitals", None):
            vitals_dict = {
                "spo2":         v.vitals.spo2,
                "heart_rate":   v.vitals.heart_rate,
                "systolic_bp":  v.vitals.systolic_bp,
            }
        existing = json.loads(v.existing_conditions) if v.existing_conditions else []
        state: TwinState = compute_twin_state(
            visit_id=v.visit_id,
            visit_timestamp=v.visit_timestamp,
            initial_risk_score=float(assessment.risk_score),
            initial_priority=assessment.priority_level,
            age=v.patient.age,
            existing_conditions=existing,
            vitals=vitals_dict,
        )
        return {
            "visit_id":             state.visit_id,
            "initial_risk_score":   state.initial_risk_score,
            "projected_risk_score": state.projected_risk_score,
            "twin_priority":        state.twin_priority,
            "deterioration_rate":   state.deterioration_rate,
            "minutes_waiting":      state.minutes_waiting,
            "alert_level":          state.alert_level,
            "alert_reasons":        state.alert_reasons,
            "computed_at":          state.computed_at,
        }
    except Exception as exc:
        logger.warning("Digital twin computation failed for visit %s: %s", v.visit_id, exc)
        return None

# Routes
@router.post("/patients/register", status_code=201)
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    vitals_data = data.vitals.model_dump() if data.vitals else None
    p, v = register_patient(
        db,
        name=data.name,
        age=data.age,
        gender=data.gender,
        phone=data.phone,
        chief_complaint=data.chief_complaint,
        pain_level=data.pain_level,
        symptom_duration=data.symptom_duration,
        existing_conditions=data.existing_conditions,  # FIX: was data.symptoms (wrong field)
        vitals_data=vitals_data,
    )
    return assess_patient(db, v.visit_id, data.use_ai, symptoms=data.symptoms)

@router.get("/queue/emergency")
async def get_emergency(db: Session = Depends(get_db)):
    visits = get_emergency_queue(db)
    res = []
    for v in visits:
        latest = max(v.assessments, key=lambda a: a.assessment_id) if v.assessments else None
        res.append({
            "patient":    {"patient_id": v.patient.patient_id, "name": v.patient.name, "age": v.patient.age, "gender": v.patient.gender},
            "visit":      visit_to_dict(v),
            "assessment": assessment_to_dict(latest) if latest else {},
            "summary":    {"summary_text": v.doctor_summary.summary_text} if v.doctor_summary else {},
            "twin":       twin_for_visit(v, latest),
        })
    return res

@router.get("/queue/general")
async def get_general(db: Session = Depends(get_db)):
    visits = get_general_queue(db)
    res = []
    for v in visits:
        latest = max(v.assessments, key=lambda a: a.assessment_id) if v.assessments else None
        res.append({
            "patient":    {"patient_id": v.patient.patient_id, "name": v.patient.name, "age": v.patient.age, "gender": v.patient.gender},
            "visit":      visit_to_dict(v),
            "assessment": assessment_to_dict(latest) if latest else {},
            "summary":    {"summary_text": v.doctor_summary.summary_text} if v.doctor_summary else {},
            "twin":       twin_for_visit(v, latest),
        })
    return res

@router.get("/queue/stale")
async def get_stale(db: Session = Depends(get_db)):
    visits = get_stale_patients(db)
    res = []
    for v in visits:
        latest = max(v.assessments, key=lambda a: a.assessment_id) if v.assessments else None
        res.append({
            "patient":    {"patient_id": v.patient.patient_id, "name": v.patient.name, "age": v.patient.age, "gender": v.patient.gender},
            "visit":      visit_to_dict(v),
            "assessment": assessment_to_dict(latest) if latest else {},
            "summary":    {"summary_text": v.doctor_summary.summary_text} if v.doctor_summary else {},
            "twin":       twin_for_visit(v, latest),
        })
    return res


@router.get("/visits/{visit_id}/twin")
async def get_twin_state(visit_id: int, db: Session = Depends(get_db)):
    """Return the Digital Twin projected state for a single visit."""
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")
    latest = max(visit.assessments, key=lambda a: a.assessment_id) if visit.assessments else None
    twin = twin_for_visit(visit, latest)
    if twin is None:
        raise HTTPException(status_code=404, detail="No assessment found for this visit — twin unavailable")
    return twin

@router.post("/visits/{visit_id}/twin/alert")
async def trigger_twin_alert(visit_id: int, db: Session = Depends(get_db)):
    """Flag a patient for reassessment due to dynamic deterioration projected by the Digital Twin."""
    from aarogyaq.queue_manager import log_event
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")
        
    visit.needs_reassessment = True
    db.flush()
    
    log_event(db, actor="system", action="TWIN_ALERT_TRIGGERED", visit_id=visit_id, notes="Digital Twin flagged patient for reassessment due to active deterioration.")
    
    return {"status": "alert_triggered", "needs_reassessment": True}

@router.get("/visits/{visit_id}/explanation", response_model=ExplanationResponse)
async def get_visit_explanation(visit_id: int, db: Session = Depends(get_db)):
    """Return the detailed XAI explanation elements for a patient visit."""
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")
        
    if not visit.assessments:
        raise HTTPException(status_code=422, detail=f"No assessments found for visit {visit_id}")
        
    latest_assessment = max(visit.assessments, key=lambda a: a.assessment_id)
    
    # 1. Rule breakdown
    rule_breakdown = json.loads(latest_assessment.score_breakdown) if latest_assessment.score_breakdown else []
    
    # 2. Business overrides
    from aarogyaq.summary_gen import BUSINESS_FLAG_EXPLANATIONS
    business_flags = json.loads(latest_assessment.business_rule_flags) if latest_assessment.business_rule_flags else []
    business_overrides = []
    for flag in business_flags:
        explanation = BUSINESS_FLAG_EXPLANATIONS.get(flag, f"Override logic triggered for flag: {flag}")
        business_overrides.append(
            BusinessOverrideExplanation(flag=flag, explanation=explanation)
        )
        
    # 3. Digital Twin Alert Reasons
    twin = twin_for_visit(visit, latest_assessment)
    twin_alert_reasons = twin.get("alert_reasons", []) if twin else []
    
    # 4. RL Threshold at Time
    agent = load_agent()
    raw_thresholds = get_adjusted_thresholds(visit.queue_type, agent)
    # Convert tuples to lists for JSON serialization
    rl_threshold_at_time = {
        k: [v[0], v[1]] for k, v in raw_thresholds.items()
    }
    
    return ExplanationResponse(
        rule_breakdown=rule_breakdown,
        business_overrides=business_overrides,
        twin_alert_reasons=twin_alert_reasons,
        rl_threshold_at_time=rl_threshold_at_time
    )

@router.patch("/visits/{visit_id}/status", response_model=VisitOut)
async def patch_visit_status(visit_id: int, data: VisitStatusPatch, db: Session = Depends(get_db)):
    try:
        updated = update_visit_status(db, visit_id, data.status, data.actor)
        return visit_to_dict(updated)
    except KeyError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/visits/{visit_id}/notes", status_code=201)
async def add_clinical_note(visit_id: int, data: ClinicalNoteRequest, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    note = ClinicalNote(visit_id=visit_id, author=data.author, note=data.note)
    db.add(note)
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/medications", status_code=201)
async def add_medication_order(visit_id: int, data: MedicationOrderRequest, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    order = MedicationOrder(visit_id=visit_id, doctor=data.doctor, name=data.name, dosage=data.dosage, frequency=data.frequency)
    db.add(order)
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/labs", status_code=201)
async def add_lab_order(visit_id: int, data: LabOrderRequest, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    order = LabOrder(visit_id=visit_id, doctor=data.doctor, test_name=data.test_name)
    db.add(order)
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/radiology", status_code=201)
async def add_radiology_order(visit_id: int, data: RadiologyOrderRequest, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    order = RadiologyOrder(visit_id=visit_id, doctor=data.doctor, scan_type=data.scan_type)
    db.add(order)
    db.flush()
    return {"status": "success"}

@router.patch("/visits/{visit_id}/bed")
async def assign_bed(visit_id: int, data: BedAssignmentPatch, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    visit.bed_assigned = data.bed
    db.flush()
    return {"status": "success"}

@router.patch("/visits/{visit_id}/transfer")
async def transfer_department(visit_id: int, data: DepartmentTransferPatch, db: Session = Depends(get_db)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    visit.department_assigned = data.department
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/reassess")
async def reassess(visit_id: int, data: ReassessRequest, db: Session = Depends(get_db)):
    try:
        return reassess_patient(db, visit_id, data.chief_complaint, data.pain_level, data.use_ai)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.get("/patients/{patient_id}/history")
async def patient_history(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=422, detail="Unknown patient ID")
    visits = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.visit_timestamp.desc()).all()
    
    res = []
    for v in visits:
        latest = max(v.assessments, key=lambda a: a.assessment_id) if v.assessments else None
        res.append({
            "patient": {"patient_id": v.patient.patient_id, "name": v.patient.name, "age": v.patient.age, "gender": v.patient.gender},
            "visit": visit_to_dict(v),
            "assessment": assessment_to_dict(latest) if latest else {},
            "summary": {"summary_text": v.doctor_summary.summary_text} if v.doctor_summary else {}
        })
    return res

from aarogyaq.shift_report import generate_shift_report

@router.get("/shift/report")
async def shift_report(shift_start: str, shift_end: str, db: Session = Depends(get_db)):
    try:
        s_dt = datetime.fromisoformat(shift_start)
        e_dt = datetime.fromisoformat(shift_end)
        return generate_shift_report(db, s_dt, e_dt)
    except ValueError as e:
        raise HTTPException(status_code=422, detail="Invalid datetime format")

@router.patch("/departments/{dept_name}/status", response_model=DepartmentOut)
async def patch_dept_status(dept_name: str, data: DeptStatusPatch, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.name == dept_name).first()
    if not dept:
        raise HTTPException(status_code=422, detail="Department not found")
    if data.status not in ["Available", "Busy", "Full"]:
        raise HTTPException(status_code=422, detail="Invalid status")
    
    dept.status = data.status
    db.flush()
    return dept

@router.get("/departments", response_model=List[DepartmentOut])
async def get_departments_list(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.get("/health")
async def health():
    return {"status": "ok", "db": "connected"}


# ── Reinforcement Learning endpoints ────────────────────────────────────────

@router.post("/rl/feedback", status_code=200)
async def rl_feedback(data: RLFeedbackRequest):
    """Record a patient outcome and update the RL agent Q-table.

    Called automatically when a visit status is set to Completed, or can
    be triggered manually for replay/testing.
    """
    agent = load_agent()
    state_key = make_state_key(
        queue_type=data.queue_type,
        queue_depth=data.queue_depth,
    )
    # Select the action the agent would have taken in this state
    action_idx = select_action(agent, state_key)
    reward = compute_reward(data.priority_level, data.minutes_to_attend)

    update_qtable(agent, state_key, action_idx, reward)
    apply_threshold_offset(agent, data.queue_type, action_idx)
    save_agent(agent)

    return {
        "status":         "updated",
        "episodes":       agent.episodes,
        "reward":         reward,
        "action":         ACTIONS[action_idx],
        "epsilon":        round(agent.epsilon, 4),
        "offsets":        agent.threshold_offsets,
    }


@router.get("/rl/state")
async def rl_state():
    """Return the complete RL agent state for the dashboard."""
    agent = load_agent()
    return {
        "version":           agent.version,
        "epsilon":           round(agent.epsilon, 4),
        "episodes":          agent.episodes,
        "threshold_offsets": agent.threshold_offsets,
        "qtable_size":       len(agent.qtable),
        "actions":           ACTIONS,
        "qtable_preview":    {
            k: [round(v, 4) for v in vals]
            for k, vals in list(agent.qtable.items())[:10]   # first 10 states
        },
    }


@router.get("/rl/thresholds")
async def rl_thresholds():
    """Return RL-adjusted priority score thresholds for both queue types."""
    agent = load_agent()
    return {
        "Emergency": get_adjusted_thresholds("Emergency", agent),
        "General":   get_adjusted_thresholds("General",   agent),
        "offsets":   agent.threshold_offsets,
    }


app.include_router(router)
