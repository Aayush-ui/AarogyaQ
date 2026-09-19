from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any, AsyncGenerator
from sqlalchemy.orm import Session
from datetime import datetime
import asyncio
import logging
import json

from aarogyaq.database import get_db
from aarogyaq.models import VisitOut, AssessmentOut, DepartmentOut, Visit, Department, Patient, ClinicalNote, MedicationOrder, LabOrder, RadiologyOrder, Vitals
from aarogyaq.patient_intake import register_patient
from aarogyaq.orchestrator import assess_patient, reassess_patient
from aarogyaq.queue_manager import get_emergency_queue, get_general_queue, get_stale_patients, update_visit_status
from aarogyaq.digital_twin import compute_twin_state, TwinState
from aarogyaq.rl_agent import (
    load_agent, save_agent, make_state_key, select_action,
    compute_reward, update_qtable, apply_threshold_offset,
    get_adjusted_thresholds, ACTIONS,
)
from aarogyaq.auth import (
    LoginRequest, LoginResponse, authenticate_user,
    create_access_token, get_current_user
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

# ── Authentication Endpoints ──────────────────────────────────────────────────

@router.post("/auth/login", response_model=LoginResponse)
async def login_endpoint(data: LoginRequest):
    """Authenticate clinician and issue signed HS256 JWT access token."""
    user = authenticate_user(data.username, data.password, data.role)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials or unauthorized role selection.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({
        "sub": user["username"],
        "role": user["role"],
        "name": user["name"],
        "email": user["email"],
    })
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        username=user["username"],
        role=user["role"],
        name=user["name"],
        email=user["email"],
    )

@router.post("/auth/logout")
async def logout_endpoint():
    """Client-side token invalidation confirmation."""
    return {"status": "success", "detail": "Logged out successfully"}

@router.get("/auth/me")
async def me_endpoint(current_user: dict = Depends(get_current_user)):
    """Return claims for currently authenticated clinician."""
    return current_user


@router.post("/patients/register", status_code=201)
async def register(data: RegisterRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
    res = assess_patient(db, v.visit_id, data.use_ai, symptoms=data.symptoms)

    score_breakdown_dict = {}
    if isinstance(res.get("score_breakdown"), list):
        for r in res["score_breakdown"]:
            if isinstance(r, dict) and "rule_id" in r:
                score_breakdown_dict[r.get("label") or r["rule_id"]] = r.get("score_modifier") or r.get("points") or 10
            elif isinstance(r, str):
                score_breakdown_dict[r] = 10
    elif isinstance(res.get("score_breakdown"), dict):
        score_breakdown_dict = res["score_breakdown"]

    res["patient"] = {
        "patient_id": p.patient_id,
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "phone": p.phone,
    }
    res["visit"] = visit_to_dict(v)
    res["assessment"] = {
        "risk_score": res["risk_score"],
        "priority_level": res["priority_level"],
        "mapped_symptoms": res["mapped_symptoms"],
        "confidence_scores": res["confidence_scores"],
        "contributing_factors": res["contributing_factors"],
        "score_breakdown": score_breakdown_dict,
    }
    res["summary_text"] = res.get("summary", "")
    return res

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



# ── R-SED-01: Real-time SSE Live Queue Stream ────────────────────────────────

async def _queue_event_generator(
    request: Request,
    db: Session,
) -> AsyncGenerator[str, None]:
    """Yield Server-Sent Event frames with the live queue snapshot every 3 s.

    The connection is closed automatically when the client disconnects.
    """
    while True:
        if await request.is_disconnected():
            break

        try:
            emergency_visits = get_emergency_queue(db)
            general_visits = get_general_queue(db)

            def _serialize(visits) -> list:
                out = []
                for v in visits:
                    latest = max(v.assessments, key=lambda a: a.assessment_id) if v.assessments else None
                    out.append({
                        "patient":    {"patient_id": v.patient.patient_id, "name": v.patient.name, "age": v.patient.age, "gender": v.patient.gender},
                        "visit":      visit_to_dict(v),
                        "assessment": assessment_to_dict(latest) if latest else {},
                        "summary":    {"summary_text": v.doctor_summary.summary_text} if v.doctor_summary else {},
                        "twin":       twin_for_visit(v, latest),
                    })
                return out

            payload = json.dumps({
                "emergency": _serialize(emergency_visits),
                "general":   _serialize(general_visits),
                "timestamp": datetime.utcnow().isoformat(),
            }, default=str)

            yield f"data: {payload}\n\n"
        except Exception as exc:
            logger.error("SSE queue stream error: %s", exc)
            yield f"event: error\ndata: {{\"detail\": \"{str(exc)}\"\\\'}}\n\n"

        await asyncio.sleep(3)


@router.get("/queue/stream")
async def queue_stream(request: Request, db: Session = Depends(get_db)):
    """Real-time Server-Sent Events stream of the live triage queue.

    Emits one SSE frame every 3 seconds containing the full emergency and
    general queue snapshots.  Connect with ``EventSource`` on the frontend.
    The stream ends when the client closes the connection.
    """
    return StreamingResponse(
        _queue_event_generator(request, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


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

@router.get("/visits/{visit_id}/export")
async def export_visit_xai(visit_id: int, db: Session = Depends(get_db)):
    """Export complete XAI triage dossier and patient clinical state as a downloadable JSON document."""
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")

    if not visit.assessments:
        raise HTTPException(status_code=422, detail=f"No assessments found for visit {visit_id}")

    latest_assessment = max(visit.assessments, key=lambda a: a.assessment_id)
    rule_breakdown = json.loads(latest_assessment.score_breakdown) if latest_assessment.score_breakdown else []
    
    from aarogyaq.summary_gen import BUSINESS_FLAG_EXPLANATIONS
    business_flags = json.loads(latest_assessment.business_rule_flags) if latest_assessment.business_rule_flags else []
    business_overrides = []
    for flag in business_flags:
        explanation = BUSINESS_FLAG_EXPLANATIONS.get(flag, f"Override logic triggered for flag: {flag}")
        business_overrides.append({"flag": flag, "explanation": explanation})

    twin = twin_for_visit(visit, latest_assessment)
    twin_alert_reasons = twin.get("alert_reasons", []) if twin else []

    agent = load_agent()
    raw_thresholds = get_adjusted_thresholds(visit.queue_type, agent)
    rl_threshold_at_time = {k: [v[0], v[1]] for k, v in raw_thresholds.items()}

    export_payload = {
        "export_metadata": {
            "system": "AarogyaQ CDSS & Dynamic Triage",
            "version": "1.0.0",
            "exported_at": datetime.utcnow().isoformat(),
            "standard": "Explainable AI (XAI) Clinical Audit Dossier",
        },
        "patient": {
            "patient_id": visit.patient.patient_id,
            "name": visit.patient.name,
            "age": visit.patient.age,
            "gender": visit.patient.gender,
            "phone": visit.patient.phone,
        },
        "visit": visit_to_dict(visit),
        "assessment": assessment_to_dict(latest_assessment),
        "doctor_summary": visit.doctor_summary.summary_text if visit.doctor_summary else "",
        "digital_twin": twin,
        "xai_explanation": {
            "risk_score": latest_assessment.risk_score,
            "priority_level": latest_assessment.priority_level,
            "rule_breakdown": rule_breakdown,
            "business_overrides": business_overrides,
            "twin_alert_reasons": twin_alert_reasons,
            "rl_threshold_at_time": rl_threshold_at_time,
        }
    }

    content = json.dumps(export_payload, indent=2, default=str)
    filename = f"aarogyaq_xai_visit_{visit_id}_{visit.patient.patient_id}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

@router.patch("/visits/{visit_id}/status", response_model=VisitOut)
async def patch_visit_status(visit_id: int, data: VisitStatusPatch, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        updated = update_visit_status(db, visit_id, data.status, data.actor)
        return visit_to_dict(updated)
    except KeyError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/visits/{visit_id}/notes", status_code=201)
async def add_clinical_note(visit_id: int, data: ClinicalNoteRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    note = ClinicalNote(visit_id=visit_id, author=data.author, note=data.note)
    db.add(note)
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/medications", status_code=201)
async def add_medication_order(visit_id: int, data: MedicationOrderRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    order = MedicationOrder(visit_id=visit_id, doctor=data.doctor, name=data.name, dosage=data.dosage, frequency=data.frequency)
    db.add(order)
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/labs", status_code=201)
async def add_lab_order(visit_id: int, data: LabOrderRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    order = LabOrder(visit_id=visit_id, doctor=data.doctor, test_name=data.test_name)
    db.add(order)
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/radiology", status_code=201)
async def add_radiology_order(visit_id: int, data: RadiologyOrderRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    order = RadiologyOrder(visit_id=visit_id, doctor=data.doctor, scan_type=data.scan_type)
    db.add(order)
    db.flush()
    return {"status": "success"}

@router.patch("/visits/{visit_id}/bed")
async def assign_bed(visit_id: int, data: BedAssignmentPatch, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    visit.bed_assigned = data.bed
    db.flush()
    return {"status": "success"}

@router.patch("/visits/{visit_id}/transfer")
async def transfer_department(visit_id: int, data: DepartmentTransferPatch, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=422, detail="Visit not found")
    visit.department_assigned = data.department
    db.flush()
    return {"status": "success"}

@router.post("/visits/{visit_id}/reassess")
async def reassess(visit_id: int, data: ReassessRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        return reassess_patient(db, visit_id, data.chief_complaint, data.pain_level, data.use_ai)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.patch("/visits/{visit_id}/vitals")
async def patch_visit_vitals(visit_id: int, data: VitalsPayload, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Update or record mid-visit physiological vitals and trigger dynamic re-assessment."""
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail=f"Visit {visit_id} not found")

    vitals = visit.vitals
    if vitals is None:
        vitals = Vitals(
            visit_id=visit_id,
            heart_rate=data.heart_rate,
            systolic_bp=data.systolic_bp,
            diastolic_bp=data.diastolic_bp,
            respiratory_rate=data.respiratory_rate,
            spo2=data.spo2,
            temperature=data.temperature,
            logged_at=datetime.utcnow(),
        )
        db.add(vitals)
    else:
        if data.heart_rate is not None:
            vitals.heart_rate = data.heart_rate
        if data.systolic_bp is not None:
            vitals.systolic_bp = data.systolic_bp
        if data.diastolic_bp is not None:
            vitals.diastolic_bp = data.diastolic_bp
        if data.respiratory_rate is not None:
            vitals.respiratory_rate = data.respiratory_rate
        if data.spo2 is not None:
            vitals.spo2 = data.spo2
        if data.temperature is not None:
            vitals.temperature = data.temperature
        vitals.logged_at = datetime.utcnow()

    db.flush()

    # Trigger re-assessment using existing chief complaint and pain level
    reassessment_res = reassess_patient(
        db,
        visit_id=visit_id,
        new_chief_complaint=visit.chief_complaint,
        new_pain_level=visit.pain_level,
    )

    from aarogyaq.audit import write_log
    write_log(
        db,
        visit_id=visit_id,
        actor="nurse",
        action="VITALS_UPDATED",
        notes=f"Mid-visit vitals updated: HR={vitals.heart_rate}, BP={vitals.systolic_bp}/{vitals.diastolic_bp}, SpO2={vitals.spo2}%",
    )

    latest_assessment = max(visit.assessments, key=lambda a: a.assessment_id) if visit.assessments else None
    twin_state = twin_for_visit(visit, latest_assessment)

    return {
        "status": "success",
        "visit_id": visit_id,
        "vitals": {
            "vital_id": vitals.vital_id,
            "heart_rate": vitals.heart_rate,
            "systolic_bp": vitals.systolic_bp,
            "diastolic_bp": vitals.diastolic_bp,
            "respiratory_rate": vitals.respiratory_rate,
            "spo2": vitals.spo2,
            "temperature": vitals.temperature,
            "logged_at": vitals.logged_at.isoformat() if vitals.logged_at else None,
        },
        "assessment": assessment_to_dict(latest_assessment) if latest_assessment else reassessment_res,
        "twin": twin_state,
    }

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
async def rl_feedback(data: RLFeedbackRequest, current_user: dict = Depends(get_current_user)):
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


@router.get("/rl/history")
async def rl_history():
    """Return the sequential reward history and convergence metrics of the RL agent."""
    agent = load_agent()
    return {
        "history": agent.reward_history,
        "rewards": [entry["reward"] for entry in agent.reward_history],
        "count": len(agent.reward_history),
    }


app.include_router(router)
