from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

class LessonBase(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime
    student_name: str
    notes: Optional[str] = None

class LessonCreate(LessonBase):
    pass

class Lesson(LessonBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 