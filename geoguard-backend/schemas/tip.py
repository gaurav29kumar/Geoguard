from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from models.tip import TipStatus


class TipCreate(BaseModel):
    description: str = Field(..., min_length=10)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_text: Optional[str] = None


class BankDetails(BaseModel):
    bank_account: str = Field(..., min_length=8)
    bank_ifsc: str    = Field(..., min_length=11, max_length=11)
    bank_holder: str  = Field(..., min_length=2)


class TipOut(BaseModel):
    id: str
    status: TipStatus
    description: str
    latitude: Optional[float]
    longitude: Optional[float]
    location_text: Optional[str]
    ai_check_passed: Optional[bool]
    ai_check_score: Optional[float]
    reward_amount: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class AICheckResult(BaseModel):
    tip_id: str
    passed: bool
    score: float         # 0 = genuine, 1 = fake
    message: str
