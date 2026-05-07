"""
Page 3 – State Police Oversight Board API
Review closed cases, verify or flag for corruption, trigger rewards.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from db.database import get_db
from models.case import Case, CaseStatus
from models.tip import Tip, TipStatus
from models.alert import Alert
from models.user import User, UserRole
from schemas.case import CaseOut, CaseReview
from services.auth_service import require_role

router = APIRouter()


# ── Case review queue (state board) ──────────────────────────────────────────

@router.get("/queue", response_model=list[CaseOut])
async def review_queue(
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(require_role(UserRole.state)),
):
    """All cases submitted by local police, awaiting state review."""
    result = await db.execute(
        select(Case)
        .where(Case.status == CaseStatus.pending_review)
        .order_by(desc(Case.submitted_at))
    )
    return result.scalars().all()


# ── All cases (with optional status filter) ───────────────────────────────────

@router.get("/cases", response_model=list[CaseOut])
async def all_cases(
    status: str | None = None,
    limit:  int        = 100,
    db:     AsyncSession = Depends(get_db),
    _:      User         = Depends(require_role(UserRole.state)),
):
    query = select(Case).order_by(desc(Case.submitted_at)).limit(limit)
    if status:
        query = select(Case).where(Case.status == status).order_by(desc(Case.submitted_at)).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# ── Review a single case (side-by-side detail) ────────────────────────────────

@router.get("/cases/{case_id}")
async def case_detail(
    case_id: str,
    db:      AsyncSession = Depends(get_db),
    _:       User         = Depends(require_role(UserRole.state)),
):
    """Returns the case alongside its linked tip and alert data for side-by-side review."""
    case_res = await db.execute(select(Case).where(Case.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    tip = None
    if case.tip_id:
        tip_res = await db.execute(select(Tip).where(Tip.id == case.tip_id))
        tip = tip_res.scalar_one_or_none()

    alert_res = await db.execute(select(Alert).where(Alert.id == case.alert_id))
    alert = alert_res.scalar_one_or_none()

    return {
        "case": {
            "id":              case.id,
            "status":          case.status,
            "station":         case.station,
            "mining_type":     case.mining_type,
            "suspects_count":  case.suspects_count,
            "notes":           case.notes,
            "video_path":      case.video_path,
            "fir_path":        case.fir_path,
            "has_video":       bool(case.video_path),
            "has_fir":         bool(case.fir_path),
            "submitted_at":    case.submitted_at,
            "review_notes":    case.review_notes,
            "reward_triggered":case.reward_triggered,
        },
        "tip": {
            "id":            tip.id              if tip else None,
            "description":   tip.description     if tip else None,
            "latitude":      tip.latitude        if tip else None,
            "longitude":     tip.longitude       if tip else None,
            "location_text": tip.location_text   if tip else None,
            "image_path":    tip.image_path      if tip else None,
            "ai_score":      tip.ai_check_score  if tip else None,
            "status":        tip.status          if tip else None,
            "has_bank":      bool(tip.bank_account) if tip else False,
        } if tip else None,
        "alert": {
            "id":          alert.id          if alert else None,
            "type":        alert.type        if alert else None,
            "severity":    alert.severity    if alert else None,
            "location":    alert.location    if alert else None,
            "description": alert.description if alert else None,
            "latitude":    alert.latitude    if alert else None,
            "longitude":   alert.longitude   if alert else None,
        } if alert else None,
    }


# ── Verify or Flag a case ─────────────────────────────────────────────────────

@router.post("/cases/{case_id}/review", response_model=CaseOut)
async def review_case(
    case_id:  str,
    body:     CaseReview,
    db:       AsyncSession = Depends(get_db),
    reviewer: User         = Depends(require_role(UserRole.state)),
):
    if body.action not in ("verify", "flag"):
        raise HTTPException(status_code=400, detail="Action must be 'verify' or 'flag'")

    case_res = await db.execute(select(Case).where(Case.id == case_id))
    case = case_res.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if case.status != CaseStatus.pending_review:
        raise HTTPException(status_code=400, detail="Case is not pending review")

    now = datetime.now(timezone.utc)
    case.reviewed_by  = reviewer.id
    case.review_notes = body.review_notes
    case.reviewed_at  = now

    if body.action == "verify":
        case.status = CaseStatus.verified
        # Trigger reward if bank details are linked
        if case.tip_id:
            tip_res = await db.execute(select(Tip).where(Tip.id == case.tip_id))
            tip = tip_res.scalar_one_or_none()
            if tip and tip.bank_account:
                tip.status        = TipStatus.rewarded
                tip.reward_amount = _calculate_reward(case)
                case.reward_triggered = now.isoformat()
                # In production: call banking API / NEFT transfer here

    elif body.action == "flag":
        case.status = CaseStatus.flagged
        # In production: trigger ACB notification / email alert

    await db.commit()
    await db.refresh(case)
    return case


def _calculate_reward(case: Case) -> float:
    """
    Simple reward tier based on case severity.
    Production: use a proper reward policy table.
    """
    base = {
        "Open-cast blasting": 50000,
        "Illegal quarrying":  35000,
        "Stone extraction":   20000,
        "Sand mining":        25000,
        "Other":              10000,
    }
    return float(base.get(case.mining_type, 10000))


# ── Dashboard stats (state board overview) ────────────────────────────────────

@router.get("/stats")
async def oversight_stats(
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(require_role(UserRole.state)),
):
    total_res    = await db.execute(select(func.count()).select_from(Case))
    pending_res  = await db.execute(select(func.count()).select_from(Case).where(Case.status == CaseStatus.pending_review))
    verified_res = await db.execute(select(func.count()).select_from(Case).where(Case.status == CaseStatus.verified))
    flagged_res  = await db.execute(select(func.count()).select_from(Case).where(Case.status == CaseStatus.flagged))
    rewarded_res = await db.execute(select(func.count()).select_from(Tip).where(Tip.status == TipStatus.rewarded))

    return {
        "total_cases":     total_res.scalar(),
        "pending_review":  pending_res.scalar(),
        "verified":        verified_res.scalar(),
        "flagged":         flagged_res.scalar(),
        "rewards_triggered": rewarded_res.scalar(),
    }
