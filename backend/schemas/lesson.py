from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LessonBase(BaseModel):
    date: datetime
    duration: int
    notes: Optional[str] = None
    student_id: int

class LessonCreate(LessonBase):
    pass

class LessonUpdate(BaseModel):
    date: Optional[datetime] = None
    duration: Optional[int] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None
    is_cancelled: Optional[bool] = None
    student_id: Optional[int] = None

class LessonResponse(LessonBase):
    id: int
    is_completed: bool
    is_cancelled: bool
    user_id: int

    class Config:
        from_attributes = True 