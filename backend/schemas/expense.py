from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ExpenseBase(BaseModel):
    date: datetime
    amount: int
    category: str
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    date: Optional[datetime] = None
    amount: Optional[int] = None
    category: Optional[str] = None
    description: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 