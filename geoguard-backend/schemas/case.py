from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.drone_dispatch import DroneStatus
from models.case import CaseStatus, MiningType


# ── Drone ─────────────────────────────────────────────────────────────────────

class DroneDispatchRequest(BaseModel):
    alert_id: str
    drone_id: Optional[str] = None


class DroneOut(BaseModel):
    id: str
    alert_id: str
    drone_id: Optional[str]
    status: DroneStatus
    target_lat: Optional[float]
    target_lng: Optional[float]
    yolo_result: Optional[str]
    dispatched_at: datetime
    arrived_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Case ──────────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    alert_id: str
    tip_id: Optional[str] = None
    mining_type: MiningType = MiningType.other
    suspects_count: int = 0
    notes: Optional[str] = None


class CaseOut(BaseModel):
    id: str
    alert_id: str
    tip_id: Optional[str]
    status: CaseStatus
    station: Optional[str]
    mining_type: MiningType
    suspects_count: int
    notes: Optional[str]
    video_path: Optional[str]
    fir_path: Optional[str]
    review_notes: Optional[str]
    reward_triggered: Optional[str]
    submitted_at: datetime
    reviewed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CaseReview(BaseModel):
    action: str          # "verify" | "flag"
    review_notes: Optional[str] = None
