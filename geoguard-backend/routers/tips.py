"""
Page 1 – Citizen Portal API
Endpoints for submitting anonymous tips, AI pre-check, and bank reward linking.
"""

import uuid
import shutil
import random
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from models.tip import Tip, TipStatus
from models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from schemas.tip import TipOut, AICheckResult, BankDetails
from services.ai_service import run_deepfake_check

router = APIRouter()

UPLOAD_DIR = Path("uploads/tips")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _generate_tip_id() -> str:
    return f"MIN-{random.randint(1000, 9999)}"


async def _create_alert_from_tip(tip: Tip, db: AsyncSession):
    """Auto-create a police alert when a tip passes AI check."""
    alert = Alert(
        id          = f"ALERT-{uuid.uuid4().hex[:6].upper()}",
        type        = AlertType.citizen,
        severity    = AlertSeverity.high,
        status      = AlertStatus.unverified,
        latitude    = tip.latitude,
        longitude   = tip.longitude,
        location    = tip.location_text,
        description = tip.description,
        tip_id      = tip.id,
    )
    db.add(alert)
    await db.commit()


async def _run_ai_and_update(tip_id: str, image_path: str | None):
    """Background task: run AI check and update tip status."""
    from db.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tip).where(Tip.id == tip_id))
        tip = result.scalar_one_or_none()
        if not tip:
            return

        ai = await run_deepfake_check(image_path)
        tip.ai_check_score  = ai["score"]
        tip.ai_check_passed = ai["passed"]
        tip.status = TipStatus.verified if ai["passed"] else TipStatus.ai_failed

        await db.commit()
        await db.refresh(tip)

        if ai["passed"]:
            await _create_alert_from_tip(tip, db)


# ── Submit Tip ────────────────────────────────────────────────────────────────

@router.post("/submit", response_model=TipOut, status_code=201)
async def submit_tip(
    background_tasks: BackgroundTasks,
    description:   str           = Form(...),
    latitude:      float | None  = Form(None),
    longitude:     float | None  = Form(None),
    location_text: str | None    = Form(None),
    image:         UploadFile | None = File(None),
    db:            AsyncSession  = Depends(get_db),
):
    tip_id = _generate_tip_id()

    # Save uploaded image (EXIF stripped in production via piexif)
    image_path = None
    if image and image.filename:
        ext = Path(image.filename).suffix
        image_path = str(UPLOAD_DIR / f"{tip_id}{ext}")
        with open(image_path, "wb") as f:
            shutil.copyfileobj(image.file, f)

    tip = Tip(
        id            = tip_id,
        description   = description,
        latitude      = latitude,
        longitude     = longitude,
        location_text = location_text,
        image_path    = image_path,
        status        = TipStatus.pending,
    )
    db.add(tip)
    await db.commit()
    await db.refresh(tip)

    # Run AI check in background so citizen gets Tip ID immediately
    background_tasks.add_task(_run_ai_and_update, tip_id, image_path)

    return tip


# ── Get Tip Status (citizen tracking) ────────────────────────────────────────

@router.get("/{tip_id}", response_model=TipOut)
async def get_tip_status(tip_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    return tip


# ── Link Bank Details to Tip ID ───────────────────────────────────────────────

@router.post("/{tip_id}/bank", response_model=TipOut)
async def link_bank_details(
    tip_id: str,
    body:   BankDetails,
    db:     AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    if tip.status == TipStatus.ai_failed:
        raise HTTPException(status_code=400, detail="Tip failed AI check — no reward eligibility")

    tip.bank_account = body.bank_account
    tip.bank_ifsc    = body.bank_ifsc
    tip.bank_holder  = body.bank_holder

    await db.commit()
    await db.refresh(tip)
    return tip


# ── AI Check result (polling endpoint) ───────────────────────────────────────

@router.get("/{tip_id}/ai-status", response_model=AICheckResult)
async def get_ai_status(tip_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")

    if tip.ai_check_score is None:
        return AICheckResult(tip_id=tip_id, passed=False, score=0.0, message="AI check in progress…")

    return AICheckResult(
        tip_id  = tip_id,
        passed  = tip.ai_check_passed,
        score   = tip.ai_check_score,
        message = "Genuine" if tip.ai_check_passed else "Possible manipulation detected",
    )


# ── List all tips (admin/state access) ───────────────────────────────────────

@router.get("/", response_model=list[TipOut])
async def list_tips(
    status: str | None = None,
    limit:  int = 50,
    db:     AsyncSession = Depends(get_db),
):
    query = select(Tip).order_by(Tip.created_at.desc()).limit(limit)
    if status:
        query = select(Tip).where(Tip.status == status).order_by(Tip.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
