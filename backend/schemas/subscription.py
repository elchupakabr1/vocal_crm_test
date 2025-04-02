from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SubscriptionBase(BaseModel):
    start_date: datetime
    end_date: datetime
    lessons_count: int
    price: int
    notes: Optional[str] = None
    student_id: int

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    lessons_count: Optional[int] = None
    price: Optional[int] = None
    notes: Optional[str] = None
    student_id: Optional[int] = None

class SubscriptionResponse(SubscriptionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 