from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class SubscriptionBase(BaseModel):
    name: str
    price: float
    lessons_count: int

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    first_name: str
    last_name: str
    phone: str
    total_lessons: int
    remaining_lessons: int
    user_id: Optional[int] = None

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    created_at: datetime
    subscription: Optional[Subscription] = None

    class Config:
        from_attributes = True

class LessonBase(BaseModel):
    student_id: int
    date: datetime
    duration: int = 60
    is_completed: bool = False
    user_id: Optional[int] = None

class LessonCreate(LessonBase):
    pass

class Lesson(LessonBase):
    id: int
    created_at: datetime
    student: Student

    class Config:
        from_attributes = True

class LessonUpdate(BaseModel):
    date: Optional[datetime] = None
    duration: Optional[int] = None
    is_completed: Optional[bool] = None
    notes: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserBase(BaseModel):
    username: str
    email: str
    is_admin: bool = False

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True 