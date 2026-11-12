"""User schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str
    role: Optional[str] = "driver"


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
