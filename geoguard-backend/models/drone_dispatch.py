from sqlalchemy import Column, String, Float, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from db.database import Base
import enum


class DroneStatus(str, enum.Enum):
    dispatched = "dispatched"
    en_route   = "en_route"
    verifying  = "verifying"
    returning  = "returning"
    landed     = "landed"


class DroneDispatch(Base):
    __tablename__ = "drone_dispatches"

    id              = Column(String, primary_key=True)
    alert_id        = Column(String, ForeignKey("alerts.id"), nullable=False)
    dispatched_by   = Column(String, ForeignKey("users.id"), nullable=False)
    status          = Column(Enum(DroneStatus), default=DroneStatus.dispatched)

    drone_id        = Column(String, nullable=True)            # e.g. DRONE-07
    target_lat      = Column(Float, nullable=True)
    target_lng      = Column(Float, nullable=True)

    yolo_result     = Column(String, nullable=True)            # JSON string of detections
    night_vision    = Column(String, nullable=True)            # captured image path

    dispatched_at   = Column(DateTime, server_default=func.now())
    arrived_at      = Column(DateTime, nullable=True)
    completed_at    = Column(DateTime, nullable=True)
