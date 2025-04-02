from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from fastapi_cache.decorator import cache

from api.deps import get_current_user, get_db
from models import User, Expense, Income
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from schemas.finance import FinanceSummary
from api_config import CACHE_CONFIG

router = APIRouter()

# Эндпоинты для расходов
@router.get("/expenses/", response_model=List[ExpenseResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_expenses(
    skip: int = 0,
    limit: int = 100,
    start_date: datetime = None,
    end_date: datetime = None,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if category:
        query = query.filter(Expense.category == category)
    
    expenses = query.offset(skip).limit(limit).all()
    return expenses

@router.post("/expenses/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = Expense(**expense.dict(), user_id=current_user.id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()
    if db_expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    for key, value in expense.dict(exclude_unset=True).items():
        setattr(db_expense, key, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(
        Expense.id == expense_id,
        Expense.user_id == current_user.id
    ).first()
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(expense)
    db.commit()
    return None

# Эндпоинты для доходов
@router.get("/incomes/", response_model=List[IncomeResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_incomes(
    skip: int = 0,
    limit: int = 100,
    start_date: datetime = None,
    end_date: datetime = None,
    category: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Income).filter(Income.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Income.date >= start_date)
    if end_date:
        query = query.filter(Income.date <= end_date)
    if category:
        query = query.filter(Income.category == category)
    
    incomes = query.offset(skip).limit(limit).all()
    return incomes

@router.post("/incomes/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
async def create_income(
    income: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_income = Income(**income.dict(), user_id=current_user.id)
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@router.put("/incomes/{income_id}", response_model=IncomeResponse)
async def update_income(
    income_id: int,
    income: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()
    if db_income is None:
        raise HTTPException(status_code=404, detail="Income not found")
    
    for key, value in income.dict(exclude_unset=True).items():
        setattr(db_income, key, value)
    
    db.commit()
    db.refresh(db_income)
    return db_income

@router.delete("/incomes/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()
    if income is None:
        raise HTTPException(status_code=404, detail="Income not found")
    
    db.delete(income)
    db.commit()
    return None

# Эндпоинт для получения финансовой сводки
@router.get("/summary/", response_model=FinanceSummary)
@cache(expire=CACHE_CONFIG["expire"])
async def get_finance_summary(
    start_date: datetime = None,
    end_date: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Запросы для расходов
    expenses_query = db.query(Expense).filter(Expense.user_id == current_user.id)
    if start_date:
        expenses_query = expenses_query.filter(Expense.date >= start_date)
    if end_date:
        expenses_query = expenses_query.filter(Expense.date <= end_date)
    
    total_expenses = expenses_query.with_entities(func.sum(Expense.amount)).scalar() or 0
    expenses_by_category = (
        expenses_query.with_entities(
            Expense.category,
            func.sum(Expense.amount).label('total')
        )
        .group_by(Expense.category)
        .all()
    )
    
    # Запросы для доходов
    incomes_query = db.query(Income).filter(Income.user_id == current_user.id)
    if start_date:
        incomes_query = incomes_query.filter(Income.date >= start_date)
    if end_date:
        incomes_query = incomes_query.filter(Income.date <= end_date)
    
    total_incomes = incomes_query.with_entities(func.sum(Income.amount)).scalar() or 0
    incomes_by_category = (
        incomes_query.with_entities(
            Income.category,
            func.sum(Income.amount).label('total')
        )
        .group_by(Income.category)
        .all()
    )
    
    return FinanceSummary(
        total_expenses=total_expenses,
        total_incomes=total_incomes,
        net_income=total_incomes - total_expenses,
        expenses_by_category=dict(expenses_by_category),
        incomes_by_category=dict(incomes_by_category)
    ) 