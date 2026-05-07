"""
Page 2 – Local Police Command Dashboard API
Alerts feed, status transitions, satellite injection endpoint.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from db.database import get_db
from models.alert import Alert, AlertStatus, AlertType, AlertSeverity
from models.user import User, UserRole
from schemas.alert import AlertCreate, AlertOut, AlertStatusUpdate
from services.auth_service import get_current_user, require_role
from services.ai_service import simulate_satellite_alert

router = APIRouter()


# ── List alerts (police dashboard feed) ───────────────────────────────────────

@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    status:   str | None = Query(None),
    type:     str | None = Query(None),
    limit:    int        = Query(50, le=200),
    db:       AsyncSession = Depends(get_db),
    _:        User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    query = select(Alert).order_by(desc(Alert.created_at)).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    if status:
        alerts = [a for a in alerts if a.status == status]
    if type:
        alerts = [a for a in alerts if a.type == type]

    return alerts


# ── Get single alert ──────────────────────────────────────────────────────────

@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


# ── Create alert manually (e.g. satellite pipeline injection) ─────────────────

@router.post("/", response_model=AlertOut, status_code=201)
async def create_alert(
    body: AlertCreate,
    db:   AsyncSession = Depends(get_db),
    _:    User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    alert = Alert(
        id          = f"ALERT-{uuid.uuid4().hex[:6].upper()}",
        type        = body.type,
        severity    = body.severity,
        status      = AlertStatus.unverified,
        latitude    = body.latitude,
        longitude   = body.longitude,
        location    = body.location,
        description = body.description,
        tip_id      = body.tip_id,
        station     = body.station,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


# ── Update alert status (accept case, etc.) ───────────────────────────────────

@router.patch("/{alert_id}/status", response_model=AlertOut)
async def update_alert_status(
    alert_id: str,
    body:     AlertStatusUpdate,
    db:       AsyncSession = Depends(get_db),
    officer:  User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Enforce valid status transitions
    transitions = {
        AlertStatus.unverified:      [AlertStatus.drone_en_route],
        AlertStatus.drone_en_route:  [AlertStatus.drone_verifying],
        AlertStatus.drone_verifying: [AlertStatus.confirmed],
        AlertStatus.confirmed:       [AlertStatus.accepted],
        AlertStatus.accepted:        [AlertStatus.resolved],
    }
    allowed = transitions.get(alert.status, [])
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{alert.status}' to '{body.status}'. Allowed: {[s.value for s in allowed]}"
        )

    alert.status      = body.status
    alert.assigned_to = officer.id
    await db.commit()
    await db.refresh(alert)
    return alert


# ── Accept Case shortcut ──────────────────────────────────────────────────────

@router.post("/{alert_id}/accept", response_model=AlertOut)
async def accept_case(
    alert_id: str,
    db:       AsyncSession = Depends(get_db),
    officer:  User         = Depends(require_role(UserRole.police)),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status != AlertStatus.confirmed:
        raise HTTPException(status_code=400, detail="Alert must be confirmed before accepting")

    alert.status      = AlertStatus.accepted
    alert.assigned_to = officer.id
    await db.commit()
    await db.refresh(alert)
    return alert


# ── Satellite pipeline injection (called by ESA Sentinel-2 processor) ─────────

@router.post("/satellite/ingest", response_model=AlertOut, status_code=201)
async def ingest_satellite_alert(
    latitude:  float,
    longitude: float,
    location:  str,
    db:        AsyncSession = Depends(get_db),
):
    """
    Called by the satellite change-detection pipeline when NDVI drop is detected.
    No auth required — protected by internal network in production.
    """
    sat_data = await simulate_satellite_alert()

    severity = AlertSeverity.critical if abs(sat_data["ndvi_delta"]) > 0.35 else AlertSeverity.high
    description = (
        f"Sentinel-2 NDVI drop: {sat_data['ndvi_delta']} "
        f"over {sat_data['area_hectares']} ha. "
        f"Confidence: {sat_data['confidence']*100:.1f}%"
    )

    alert = Alert(
        id          = f"SAT-{uuid.uuid4().hex[:4].upper()}",
        type        = AlertType.satellite,
        severity    = severity,
        status      = AlertStatus.unverified,
        latitude    = latitude,
        longitude   = longitude,
        location    = location,
        description = description,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


# ── Map data endpoint (returns all active alerts with coordinates) ─────────────

@router.get("/map/markers", response_model=list[AlertOut])
async def get_map_markers(
    db: AsyncSession = Depends(get_db),
):
    """Returns all non-resolved alerts for the live threat map."""
    result = await db.execute(
        select(Alert)
        .where(Alert.status != AlertStatus.resolved)
        .where(Alert.latitude.isnot(None))
        .order_by(desc(Alert.created_at))
    )
    return result.scalars().all()


@router.get("/public/list", response_model=list[AlertOut])
async def get_public_alerts(
    db: AsyncSession = Depends(get_db),
):
    """Public alert list — no auth required."""
    result = await db.execute(
        select(Alert).order_by(desc(Alert.created_at)).limit(20)
    )
    return result.scalars().all()