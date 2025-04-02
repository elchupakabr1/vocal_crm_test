from pydantic import BaseModel
from typing import Optional

class StudentBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    remaining_lessons: int = 0

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    remaining_lessons: Optional[int] = None

class StudentResponse(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 