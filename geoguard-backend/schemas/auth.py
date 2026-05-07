from pydantic import BaseModel
from typing import Optional
import enum


class UserRole(str, enum.Enum):
    citizen = "citizen"
    police  = "police"
    state   = "state"


class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole
    station: Optional[str] = None


class UserOut(BaseModel):
    id: str
    username: str
    role: UserRole
    station: Optional[str]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: str


class LoginRequest(BaseModel):
    username: str
    password: str