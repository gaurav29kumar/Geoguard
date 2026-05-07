"""
Page 2 – Case Management API
Police create cases, upload video + FIR evidence, close alerts.
"""

import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from db.database import get_db
from models.case import Case, CaseStatus, MiningType
from models.alert import Alert, AlertStatus
from models.user import User, UserRole
from schemas.case import CaseCreate, CaseOut
from services.auth_service import require_role

router = APIRouter()

EVIDENCE_DIR = Path("uploads/evidence")
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_VIDEO = {".mp4", ".mov", ".avi", ".mkv"}
ALLOWED_DOCS  = {".pdf", ".jpg", ".jpeg", ".png"}


def _save_upload(file: UploadFile, folder: Path, prefix: str) -> str:
    ext  = Path(file.filename).suffix.lower()
    path = folder / f"{prefix}{ext}"
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return str(path)


# ── Create case (from accepted alert) ─────────────────────────────────────────

@router.post("/", response_model=CaseOut, status_code=201)
async def create_case(
    body:    CaseCreate,
    db:      AsyncSession = Depends(get_db),
    officer: User         = Depends(require_role(UserRole.police)),
):
    res = await db.execute(select(Alert).where(Alert.id == body.alert_id))
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != AlertStatus.accepted:
        raise HTTPException(status_code=400, detail="Alert must be in 'accepted' state to open a case")

    # Check no duplicate case for this alert
    existing = await db.execute(select(Case).where(Case.alert_id == body.alert_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Case already exists for this alert")

    case = Case(
        id             = f"CASE-{uuid.uuid4().hex[:4].upper()}",
        alert_id       = body.alert_id,
        tip_id         = body.tip_id,
        officer_id     = officer.id,
        station        = officer.station,
        mining_type    = body.mining_type,
        suspects_count = body.suspects_count,
        notes          = body.notes,
        status         = CaseStatus.open,
    )
    db.add(case)
    await db.commit()
    await db.refresh(case)
    return case


# ── Upload evidence (video + FIR) ─────────────────────────────────────────────

@router.post("/{case_id}/evidence", response_model=CaseOut)
async def upload_evidence(
    case_id:  str,
    video:    UploadFile | None = File(None),
    fir:      UploadFile | None = File(None),
    db:       AsyncSession      = Depends(get_db),
    officer:  User              = Depends(require_role(UserRole.police)),
):
    res = await db.execute(select(Case).where(Case.id == case_id))
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status not in (CaseStatus.open,):
        raise HTTPException(status_code=400, detail="Evidence can only be uploaded for open cases")

    if video and video.filename:
        ext = Path(video.filename).suffix.lower()
        if ext not in ALLOWED_VIDEO:
            raise HTTPException(status_code=415, detail=f"Video must be one of {ALLOWED_VIDEO}")
        case.video_path = _save_upload(video, EVIDENCE_DIR, f"{case_id}_video")

    if fir and fir.filename:
        ext = Path(fir.filename).suffix.lower()
        if ext not in ALLOWED_DOCS:
            raise HTTPException(status_code=415, detail=f"FIR must be one of {ALLOWED_DOCS}")
        case.fir_path = _save_upload(fir, EVIDENCE_DIR, f"{case_id}_fir")

    # Auto-close case when both evidence items are present
    if case.video_path and case.fir_path:
        case.status = CaseStatus.pending_review

        # Mark the parent alert as resolved
        alert_res = await db.execute(select(Alert).where(Alert.id == case.alert_id))
        alert = alert_res.scalar_one_or_none()
        if alert:
            alert.status = AlertStatus.resolved

    await db.commit()
    await db.refresh(case)
    return case


# ── Get single case ───────────────────────────────────────────────────────────

@router.get("/{case_id}", response_model=CaseOut)
async def get_case(
    case_id: str,
    db:      AsyncSession = Depends(get_db),
    _:       User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    res = await db.execute(select(Case).where(Case.id == case_id))
    case = res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


# ── List cases ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[CaseOut])
async def list_cases(
    status: str | None = None,
    limit:  int        = 50,
    db:     AsyncSession = Depends(get_db),
    _:      User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    query = select(Case).order_by(desc(Case.submitted_at)).limit(limit)
    if status:
        query = select(Case).where(Case.status == status).order_by(desc(Case.submitted_at)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
