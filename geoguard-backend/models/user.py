from sqlalchemy import Column, String, Enum, DateTime
from sqlalchemy.sql import func
from db.database import Base
import enum


class UserRole(str, enum.Enum):
    citizen   = "citizen"
    police    = "police"
    state     = "state"


class User(Base):
    __tablename__ = "users"

    id         = Column(String, primary_key=True)          # UUID
    username   = Column(String, unique=True, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    role       = Column(Enum(UserRole), nullable=False)
    station    = Column(String, nullable=True)              # police only
    created_at = Column(DateTime, server_default=func.now())
