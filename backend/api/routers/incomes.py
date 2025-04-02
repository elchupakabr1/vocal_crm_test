from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from api.deps import get_db, get_current_user
from schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from models.income import Income
from models.user import User

router = APIRouter()

@router.post("/", response_model=IncomeResponse)
def create_income(
    income: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_income = Income(
        **income.dict(),
        user_id=current_user.id
    )
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@router.get("/", response_model=List[IncomeResponse])
def read_incomes(
    skip: int = 0,
    limit: int = 100,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Income).filter(Income.user_id == current_user.id)
    
    if start_date:
        query = query.filter(Income.date >= start_date)
    if end_date:
        query = query.filter(Income.date <= end_date)
    
    return query.offset(skip).limit(limit).all()

@router.get("/{income_id}", response_model=IncomeResponse)
def read_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()
    
    if income is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доход не найден"
        )
    return income

@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доход не найден"
        )
    
    for field, value in income.dict(exclude_unset=True).items():
        setattr(db_income, field, value)
    
    db.commit()
    db.refresh(db_income)
    return db_income

@router.delete("/{income_id}")
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()
    
    if income is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Доход не найден"
        )
    
    db.delete(income)
    db.commit()
    return {"message": "Доход успешно удален"} 