from sqlalchemy import Column, String, Integer, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from db.database import Base
import enum


class CaseStatus(str, enum.Enum):
    open            = "open"
    pending_review  = "pending_review"   # submitted by police, awaiting state
    verified        = "verified"          # state approved, reward triggered
    flagged         = "flagged"           # state flagged for corruption


class MiningType(str, enum.Enum):
    open_cast   = "Open-cast blasting"
    quarrying   = "Illegal quarrying"
    stone       = "Stone extraction"
    sand        = "Sand mining"
    other       = "Other"


class Case(Base):
    __tablename__ = "cases"

    id              = Column(String, primary_key=True)          # CASE-XXXX
    alert_id        = Column(String, ForeignKey("alerts.id"), nullable=False)
    tip_id          = Column(String, ForeignKey("tips.id"), nullable=True)
    status          = Column(Enum(CaseStatus), default=CaseStatus.open)

    # Police submission
    officer_id      = Column(String, ForeignKey("users.id"), nullable=False)
    station         = Column(String, nullable=True)
    mining_type     = Column(Enum(MiningType), default=MiningType.other)
    suspects_count  = Column(Integer, default=0)
    notes           = Column(Text, nullable=True)

    # Evidence paths (stored in /uploads/evidence/)
    video_path      = Column(String, nullable=True)
    fir_path        = Column(String, nullable=True)

    # State review
    reviewed_by     = Column(String, ForeignKey("users.id"), nullable=True)
    review_notes    = Column(Text, nullable=True)
    reward_triggered = Column(String, nullable=True)            # timestamp

    submitted_at    = Column(DateTime, server_default=func.now())
    reviewed_at     = Column(DateTime, nullable=True)
