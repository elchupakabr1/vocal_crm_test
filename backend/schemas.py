from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class User(UserBase):
    id: int
    is_active: bool = True

    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=2, max_length=50, description="Имя студента")
    last_name: str = Field(..., min_length=2, max_length=50, description="Фамилия студента")
    phone: str = Field(..., pattern=r'^\+?[0-9]{10,15}$', description="Номер телефона в формате +79001234567")
    email: Optional[str] = Field(None, pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', description="Email студента")
    total_lessons: int = Field(ge=0, description="Общее количество уроков")
    remaining_lessons: int = Field(ge=0, description="Оставшееся количество уроков")
    subscription_id: Optional[int] = Field(None, description="ID абонемента")

    @validator('remaining_lessons')
    def validate_remaining_lessons(cls, v, values):
        if 'total_lessons' in values and v > values['total_lessons']:
            raise ValueError('Оставшееся количество уроков не может превышать общее количество')
        return v

class StudentCreate(StudentBase):
    pass

class Student(StudentBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LessonBase(BaseModel):
    date: datetime
    duration: int = Field(..., ge=30, le=180)
    student_id: int

class LessonCreate(LessonBase):
    pass

class Lesson(LessonBase):
    id: int
    student: Student

    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., ge=0)
    lessons_count: int = Field(..., ge=1)

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    amount: float = Field(..., ge=0)
    description: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., min_length=2, max_length=50)
    date: datetime | None = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class IncomeBase(BaseModel):
    amount: float = Field(..., ge=0)
    description: str = Field(..., min_length=2, max_length=200)
    category: str = Field(..., min_length=2, max_length=50)
    date: datetime | None = None

class IncomeCreate(IncomeBase):
    pass

class Income(IncomeBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class RentSettingsBase(BaseModel):
    amount: float = Field(..., ge=0)
    payment_day: int = Field(..., ge=1, le=31)

class RentSettingsCreate(RentSettingsBase):
    pass

class RentSettings(RentSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 