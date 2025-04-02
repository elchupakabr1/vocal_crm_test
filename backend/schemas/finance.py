from pydantic import BaseModel
from typing import Dict

class FinanceSummary(BaseModel):
    total_expenses: int
    total_incomes: int
    net_income: int
    expenses_by_category: Dict[str, int]
    incomes_by_category: Dict[str, int] 