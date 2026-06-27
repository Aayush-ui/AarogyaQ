from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from aarogyaq.database import get_db
from aarogyaq.models import VisitOut, AssessmentOut, DepartmentOut, Visit, Department, Patient, ClinicalNote, MedicationOrder, LabOrder, RadiologyOrder
from aarogyaq.patient_intake import register_patient
from aarogyaq.orchestrator import assess_patient, reassess_patient
from aarogyaq.queue_manager import get_emergency_queue, get_general_queue, get_stale_patients, update_visit_status

logger = logging.getLogger(__name__)

app = FastAPI(title="AarogyaQ API")
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
    symptoms: List[str] = []
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

# Helpers
import json

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
        existing_conditions=data.symptoms,
        vitals_data=vitals_data
    )
    return assess_patient(db, v.visit_id, data.use_ai)

@router.get("/queue/emergency")
async def get_emergency(db: Session = Depends(get_db)):
    visits = get_emergency_queue(db)
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

@router.get("/queue/general")
async def get_general(db: Session = Depends(get_db)):
    visits = get_general_queue(db)
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

@router.get("/queue/stale")
async def get_stale(db: Session = Depends(get_db)):
    visits = get_stale_patients(db)
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

app.include_router(router)
