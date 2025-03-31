from pydantic import BaseModel
from typing import Optional, List
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

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    total_lessons: int = 0
    remaining_lessons: int = 0

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    subscription_id: Optional[int] = None

    class Config:
        from_attributes = True

class LessonBase(BaseModel):
    date: datetime
    duration: int
    student_id: int

class LessonCreate(LessonBase):
    pass

class Lesson(LessonBase):
    id: int
    student: Student

    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    name: str
    price: float
    lessons_count: int

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: int

    class Config:
        from_attributes = True 