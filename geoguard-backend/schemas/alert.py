from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.alert import AlertType, AlertSeverity, AlertStatus


class AlertCreate(BaseModel):
    type: AlertType
    severity: AlertSeverity = AlertSeverity.medium
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[str] = None
    description: Optional[str] = None
    tip_id: Optional[str] = None
    station: Optional[str] = None


class AlertOut(BaseModel):
    id: str
    type: AlertType
    severity: AlertSeverity
    status: AlertStatus
    latitude: Optional[float]
    longitude: Optional[float]
    location: Optional[str]
    description: Optional[str]
    tip_id: Optional[str]
    station: Optional[str]
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: AlertStatus
