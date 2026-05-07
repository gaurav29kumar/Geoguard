from sqlalchemy import Column, String, Float, Text, Enum, DateTime, Boolean
from sqlalchemy.sql import func
from db.database import Base
import enum


class TipStatus(str, enum.Enum):
    pending    = "pending"       # submitted, AI check queued
    ai_failed  = "ai_failed"     # deepfake detected
    verified   = "verified"      # AI passed, live on police map
    rewarded   = "rewarded"      # state confirmed → bank transfer done


class Tip(Base):
    __tablename__ = "tips"

    id               = Column(String, primary_key=True)        # e.g. MIN-4829
    status           = Column(Enum(TipStatus), default=TipStatus.pending)

    # Location
    latitude         = Column(Float, nullable=True)
    longitude        = Column(Float, nullable=True)
    location_text    = Column(String, nullable=True)

    # Report details
    description      = Column(Text, nullable=False)
    image_path       = Column(String, nullable=True)           # saved upload path
    ai_check_score   = Column(Float, nullable=True)            # 0-1 fake probability
    ai_check_passed  = Column(Boolean, nullable=True)

    # Reward (encrypted / hashed in production)
    bank_account     = Column(String, nullable=True)
    bank_ifsc        = Column(String, nullable=True)
    bank_holder      = Column(String, nullable=True)
    reward_amount    = Column(Float, nullable=True)

    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, onupdate=func.now())
