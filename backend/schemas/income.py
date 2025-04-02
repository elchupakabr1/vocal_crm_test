from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class IncomeBase(BaseModel):
    date: datetime
    amount: int
    category: str
    description: Optional[str] = None

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    date: Optional[datetime] = None
    amount: Optional[int] = None
    category: Optional[str] = None
    description: Optional[str] = None

class IncomeResponse(IncomeBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 