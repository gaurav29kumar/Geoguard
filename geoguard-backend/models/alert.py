from sqlalchemy import Column, String, Float, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from db.database import Base
import enum


class AlertType(str, enum.Enum):
    citizen   = "citizen"
    satellite = "satellite"


class AlertSeverity(str, enum.Enum):
    low      = "low"
    medium   = "medium"
    high     = "high"
    critical = "critical"


class AlertStatus(str, enum.Enum):
    unverified       = "unverified"
    drone_en_route   = "drone_en_route"
    drone_verifying  = "drone_verifying"
    confirmed        = "confirmed"
    accepted         = "accepted"        # officer accepted case
    resolved         = "resolved"        # evidence uploaded, closed


class Alert(Base):
    __tablename__ = "alerts"

    id           = Column(String, primary_key=True)
    type         = Column(Enum(AlertType), nullable=False)
    severity     = Column(Enum(AlertSeverity), default=AlertSeverity.medium)
    status       = Column(Enum(AlertStatus), default=AlertStatus.unverified)

    # Location
    latitude     = Column(Float, nullable=True)
    longitude    = Column(Float, nullable=True)
    location     = Column(String, nullable=True)
    description  = Column(Text, nullable=True)

    # Links
    tip_id       = Column(String, ForeignKey("tips.id"), nullable=True)
    assigned_to  = Column(String, ForeignKey("users.id"), nullable=True)  # officer
    station      = Column(String, nullable=True)

    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, onupdate=func.now())
