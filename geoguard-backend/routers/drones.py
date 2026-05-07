"""
Page 2 – Drone Dispatch API
Dispatch drones, poll status, receive simulated YOLO results.
"""

import uuid
import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from models.drone_dispatch import DroneDispatch, DroneStatus
from models.alert import Alert, AlertStatus
from models.user import User, UserRole
from schemas.case import DroneDispatchRequest, DroneOut
from services.auth_service import require_role
from services.ai_service import run_yolo_detection

router = APIRouter()


async def _simulate_drone_mission(dispatch_id: str, alert_id: str, image_path: str | None = None):
    """
    Background task that simulates the drone lifecycle:
    dispatched → en_route (30s) → verifying (YOLO runs) → landed
    and updates the parent alert accordingly.
    """
    from db.database import AsyncSessionLocal

    async def _update(status: DroneStatus, extra: dict = {}):
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(DroneDispatch).where(DroneDispatch.id == dispatch_id))
            d = res.scalar_one_or_none()
            if d:
                d.status = status
                for k, v in extra.items():
                    setattr(d, k, v)
                await db.commit()

    async def _update_alert(status: AlertStatus):
        async with AsyncSessionLocal() as db:
            res = await db.execute(select(Alert).where(Alert.id == alert_id))
            a = res.scalar_one_or_none()
            if a:
                a.status = status
                await db.commit()

    # Simulate travel time (~30 seconds for demo; use real telemetry in prod)
    await asyncio.sleep(8)
    await _update(DroneStatus.en_route, {"arrived_at": datetime.now(timezone.utc)})
    await _update_alert(AlertStatus.drone_en_route)

    await asyncio.sleep(10)
    await _update(DroneStatus.verifying)
    await _update_alert(AlertStatus.drone_verifying)

    # Run YOLO detection
    yolo = await run_yolo_detection(image_path)
    import json
    yolo_json = json.dumps(yolo)

    await asyncio.sleep(5)
    final_status = DroneStatus.returning
    alert_final  = AlertStatus.confirmed if yolo["confirmed_mining"] else AlertStatus.unverified

    await _update(final_status, {
        "yolo_result":   yolo_json,
        "completed_at":  datetime.now(timezone.utc),
    })
    await _update_alert(alert_final)

    await asyncio.sleep(5)
    await _update(DroneStatus.landed)


# ── Dispatch drone ────────────────────────────────────────────────────────────

@router.post("/dispatch", response_model=DroneOut, status_code=201)
async def dispatch_drone(
    body:             DroneDispatchRequest,
    background_tasks: BackgroundTasks,
    db:               AsyncSession = Depends(get_db),
    officer:          User         = Depends(require_role(UserRole.police)),
):
    # Validate alert exists and is in correct state
    res = await db.execute(select(Alert).where(Alert.id == body.alert_id))
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status not in (AlertStatus.unverified,):
        raise HTTPException(status_code=400, detail=f"Alert status '{alert.status}' cannot have a drone dispatched")

    drone_id = body.drone_id or f"DRONE-{uuid.uuid4().hex[:2].upper()}"
    dispatch  = DroneDispatch(
        id            = str(uuid.uuid4()),
        alert_id      = body.alert_id,
        dispatched_by = officer.id,
        drone_id      = drone_id,
        status        = DroneStatus.dispatched,
        target_lat    = alert.latitude,
        target_lng    = alert.longitude,
    )
    db.add(dispatch)

    # Set alert to en_route immediately
    alert.status = AlertStatus.drone_en_route
    await db.commit()
    await db.refresh(dispatch)

    # Kick off simulation in background
    background_tasks.add_task(_simulate_drone_mission, dispatch.id, alert.id)

    return dispatch


# ── Get drone status ──────────────────────────────────────────────────────────

@router.get("/{dispatch_id}", response_model=DroneOut)
async def get_dispatch_status(
    dispatch_id: str,
    db:          AsyncSession = Depends(get_db),
    _:           User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    res = await db.execute(select(DroneDispatch).where(DroneDispatch.id == dispatch_id))
    d = res.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    return d


# ── List all dispatches ───────────────────────────────────────────────────────

@router.get("/", response_model=list[DroneOut])
async def list_dispatches(
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    res = await db.execute(
        select(DroneDispatch).order_by(DroneDispatch.dispatched_at.desc()).limit(50)
    )
    return res.scalars().all()


# ── List dispatches for a specific alert ─────────────────────────────────────

@router.get("/alert/{alert_id}", response_model=list[DroneOut])
async def dispatches_for_alert(
    alert_id: str,
    db:       AsyncSession = Depends(get_db),
    _:        User         = Depends(require_role(UserRole.police, UserRole.state)),
):
    res = await db.execute(
        select(DroneDispatch)
        .where(DroneDispatch.alert_id == alert_id)
        .order_by(DroneDispatch.dispatched_at.desc())
    )
    return res.scalars().all()
