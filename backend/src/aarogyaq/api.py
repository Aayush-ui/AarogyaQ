"""
Single responsibility: define all FastAPI routes for the AarogyaQ REST API.

Route handlers are intentionally thin: they validate HTTP-layer concerns
(path/query params, auth headers) and delegate immediately to the orchestrator
or service modules.  No business logic lives here.
"""
from __future__ import annotations

from fastapi import APIRouter, FastAPI, status, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from aarogyaq.database import get_db
from aarogyaq.department import list_departments, update_department_status
from aarogyaq.models import (
    DepartmentResponse,
    DepartmentStatusUpdate,
    PatientCreate,
    PatientResponse,
    TriageResult,
    VisitCreate,
    VisitResponse,
    VisitStatusUpdate,
    Visit,
    Assessment,
    DoctorSummary,
    VisitOut,
    AssessmentOut,
    SummaryOut,
    AuditLogOut,
)
from aarogyaq.orchestrator import reassess_visit, triage_new_visit
from aarogyaq.patient_intake import (
    find_patients_by_phone,
    get_patient,
    register_patient,
)
from aarogyaq.queue_manager import (
    get_active_queue,
    mark_attending,
    mark_completed,
    update_visit_status,
)
from aarogyaq.audit import get_audit_trail
from aarogyaq.shift_report import generate_shift_report

app = FastAPI(
    title="AarogyaQ",
    description="AI-powered hospital patient triage and queue management CDSS",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

router = APIRouter(prefix="/api/v1")


# ── System ────────────────────────────────────────────────────────────────────

@router.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Return a simple liveness response."""
    return {"status": "ok"}


# ── Patients ──────────────────────────────────────────────────────────────────

@router.post(
    "/patients",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["patients"],
)
async def create_patient(data: PatientCreate, db: Session = Depends(get_db)) -> Any:
    """Register a new patient and return their record."""
    try:
        p = register_patient(db, data)
        return p
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/patients/{patient_id}", response_model=PatientResponse, tags=["patients"])
async def read_patient(patient_id: str, db: Session = Depends(get_db)) -> Any:
    """Retrieve a patient by their ARQ ID."""
    try:
        return get_patient(db, patient_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/patients", response_model=list[PatientResponse], tags=["patients"])
async def search_patients_by_phone(phone: str, db: Session = Depends(get_db)) -> Any:
    """Search patients by phone number."""
    return find_patients_by_phone(db, phone)


# ── Visits / Triage ───────────────────────────────────────────────────────────

@router.post(
    "/visits",
    response_model=TriageResult,
    status_code=status.HTTP_201_CREATED,
    tags=["triage"],
)
async def open_visit(data: VisitCreate, use_ai: bool = False, db: Session = Depends(get_db)) -> Any:
    """Open a new visit and run the full triage pipeline."""
    try:
        return triage_new_visit(db, data.patient_id, data, use_ai)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/visits/{visit_id}", tags=["triage"])
async def read_visit(visit_id: int, db: Session = Depends(get_db)) -> Any:
    """Retrieve full visit details including latest assessment and summary."""
    v = db.get(Visit, visit_id)
    if not v:
        raise HTTPException(status_code=404, detail="Visit not found")
        
    p = get_patient(db, v.patient_id)
    
    assessment = None
    if v.assessments:
        active_a = max(v.assessments, key=lambda x: x.assessment_id)
        assessment = AssessmentOut.model_validate(active_a)
        
    summary = None
    if v.doctor_summaries:
        latest_s = max(v.doctor_summaries, key=lambda x: x.summary_id)
        summary = SummaryOut.model_validate(latest_s)
        
    return {
        "visit": VisitOut.model_validate(v),
        "patient": PatientResponse.model_validate(p),
        "assessment": assessment,
        "summary": summary
    }


@router.post(
    "/visits/{visit_id}/reassess",
    response_model=TriageResult,
    tags=["triage"],
)
async def reassess(
    visit_id: int,
    new_complaint: str | None = None,
    use_ai: bool = False,
    db: Session = Depends(get_db)
) -> Any:
    """Trigger a reassessment for an existing visit."""
    try:
        return reassess_visit(db, visit_id, new_complaint, use_ai)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch(
    "/visits/{visit_id}/status",
    response_model=VisitResponse,
    tags=["queue"],
)
async def update_status(
    visit_id: int,
    payload: VisitStatusUpdate,
    actor: str = "system",
    db: Session = Depends(get_db)
) -> Any:
    """Update the workflow status of a visit."""
    try:
        return update_visit_status(db, visit_id, payload.status, actor)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Queue ─────────────────────────────────────────────────────────────────────

@router.get("/queue", tags=["queue"])
async def get_queue(queue_type: str | None = None, db: Session = Depends(get_db)) -> Any:
    """Return the live sorted patient queue."""
    return get_active_queue(db, queue_type)


# ── Departments ───────────────────────────────────────────────────────────────

@router.get(
    "/departments",
    response_model=list[DepartmentResponse],
    tags=["departments"],
)
async def read_departments(db: Session = Depends(get_db)) -> Any:
    """List all departments and their current status."""
    return list_departments(db)


@router.patch(
    "/departments/{dept_id}/status",
    response_model=DepartmentResponse,
    tags=["departments"],
)
async def update_dept_status(dept_id: int, payload: DepartmentStatusUpdate, db: Session = Depends(get_db)) -> Any:
    """Update a department's availability status."""
    try:
        return update_department_status(db, dept_id, payload.status)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Audit ─────────────────────────────────────────────────────────────────────

@router.get("/visits/{visit_id}/audit", response_model=list[AuditLogOut], tags=["audit"])
async def read_audit_trail(visit_id: int, db: Session = Depends(get_db)) -> Any:
    """Retrieve the full audit trail for a visit."""
    try:
        return get_audit_trail(db, visit_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Shift Report ──────────────────────────────────────────────────────────────

@router.get("/shift-report", tags=["reports"])
async def get_shift_report(start: str, end: str, db: Session = Depends(get_db)) -> Any:
    """Generate an aggregate shift report for the given UTC time window."""
    try:
        s_dt = datetime.fromisoformat(start)
        e_dt = datetime.fromisoformat(end)
        return generate_shift_report(db, s_dt, e_dt)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


app.include_router(router)
