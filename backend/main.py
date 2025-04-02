# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Depends, status, Request, File, UploadFile, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.encoders import jsonable_encoder
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import sqlite3
import os
from dotenv import load_dotenv
from functools import lru_cache
import asyncio
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import schemas
from sqlalchemy import func
from schemas import TokenData
import logging
import shutil
from config import settings
from contextlib import asynccontextmanager

# Настройка логгера
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Создание таблиц
models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Инициализация при запуске
    FastAPICache.init(InMemoryBackend())
    yield
    # Очистка при выключении
    await FastAPICache.clear()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Добавляем middleware для отключения кэширования
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600
)

# Добавляем сжатие ответов
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Настройки безопасности
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/token")

# Создаем пул потоков для операций с БД
db_pool = ThreadPoolExecutor(max_workers=4)

# Кэширование подключений к БД
@lru_cache(maxsize=1)
def get_db_connection():
    return sqlite3.connect(settings.DATABASE_URL.replace('sqlite:///', ''), check_same_thread=False)

# Модели данных
class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    password: str

class Lesson(BaseModel):
    id: Optional[int] = None
    date: datetime
    duration: int
    student_id: int
    is_completed: bool = False
    notes: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-03-28T10:00:00",
                "duration": 60,
                "student_id": 1,
                "is_completed": False,
                "notes": "Повторение гамм"
            }
        }

# Функции для работы с токенами
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# Добавляем обработку OPTIONS запросов для всех эндпоинтов
@app.options("/api/{path:path}")
async def options_handler(path: str):
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

@app.post("/api/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/api/lessons/", response_model=schemas.Lesson)
async def create_lesson(
    lesson: schemas.LessonCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Проверяем существование ученика
    student = db.query(models.Student).filter(
        models.Student.id == lesson.student_id,
        models.Student.user_id == current_user.id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Проверяем наличие оставшихся занятий
    if student.remaining_lessons <= 0:
        raise HTTPException(status_code=400, detail="No remaining lessons")
    
    # Создаем занятие
    db_lesson = models.Lesson(
        date=lesson.date,
        duration=lesson.duration,
        student_id=lesson.student_id,
        user_id=current_user.id
    )
    db.add(db_lesson)
    
    # Обновляем количество оставшихся занятий
    student.remaining_lessons -= 1
    
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

@app.get(f"{settings.API_V1_STR}/lessons/", response_model=List[schemas.Lesson])
@cache(expire=30)  # Кэширование на 30 секунд
async def get_lessons(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lessons = db.query(models.Lesson)\
        .filter(models.Lesson.user_id == current_user.id)\
        .offset(skip)\
        .limit(limit)\
        .all()
    return lessons

@app.delete("/api/lessons/{lesson_id}/")
async def delete_lesson(
    lesson_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lesson = db.query(models.Lesson).filter(
        models.Lesson.id == lesson_id,
        models.Lesson.user_id == current_user.id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Возвращаем занятие в счетчик ученика
    student = db.query(models.Student).filter(
        models.Student.id == lesson.student_id,
        models.Student.user_id == current_user.id
    ).first()
    if student:
        student.remaining_lessons += 1
    
    db.delete(lesson)
    db.commit()
    return {"message": "Lesson deleted successfully"}

@app.post(f"{settings.API_V1_STR}/students/", response_model=schemas.Student)
async def create_student(
    student: schemas.StudentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Получены данные для создания студента: {student.model_dump()}")
        db_student = models.Student(
            **student.model_dump(),
            user_id=current_user.id
        )
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        logger.info(f"Студент успешно создан: {db_student.id}")
        return db_student
    except Exception as e:
        logger.error(f"Ошибка при создании студента: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get(f"{settings.API_V1_STR}/students/", response_model=List[schemas.Student])
async def read_students(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    students = db.query(models.Student)\
        .filter(models.Student.user_id == current_user.id)\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    response = JSONResponse(
        content=[jsonable_encoder(student) for student in students],
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
            "X-Content-Type-Options": "nosniff"
        }
    )
    return response

@app.get("/api/students/{student_id}", response_model=schemas.Student)
async def read_student(
    student_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.user_id == current_user.id
    ).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@app.put(f"{settings.API_V1_STR}/students/{{student_id}}", response_model=schemas.Student)
async def update_student(
    student_id: int,
    student: schemas.StudentUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.user_id == current_user.id
    ).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Обновляем данные студента
    for key, value in student.model_dump(exclude_unset=True).items():
        setattr(db_student, key, value)
    
    db.commit()
    db.refresh(db_student)
    
    # Очищаем кэш после обновления
    await FastAPICache.clear()
    
    return db_student

@app.delete("/api/students/{student_id}")
async def delete_student(
    student_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.user_id == current_user.id
    ).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(db_student)
    db.commit()
    return {"message": "Student deleted successfully"}

@app.post("/api/subscriptions/", response_model=schemas.Subscription)
async def create_subscription(
    subscription: schemas.SubscriptionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_subscription = models.Subscription(**subscription.dict(), user_id=current_user.id)
        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)
        return db_subscription
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/subscriptions/", response_model=List[schemas.Subscription])
async def read_subscriptions(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subscriptions = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return subscriptions

@app.get("/api/subscriptions/{subscription_id}", response_model=schemas.Subscription)
async def read_subscription(
    subscription_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.user_id == current_user.id
    ).first()
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription

@app.put("/api/subscriptions/{subscription_id}", response_model=schemas.Subscription)
async def update_subscription(
    subscription_id: int,
    subscription: schemas.SubscriptionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.user_id == current_user.id
    ).first()
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    for key, value in subscription.dict().items():
        setattr(db_subscription, key, value)
    
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

@app.delete("/api/subscriptions/{subscription_id}")
async def delete_subscription(
    subscription_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subscription = db.query(models.Subscription).filter(
        models.Subscription.id == subscription_id,
        models.Subscription.user_id == current_user.id
    ).first()
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    db.delete(subscription)
    db.commit()
    return {"message": "Subscription deleted successfully"}

# Эндпоинты для расходов
@app.get("/api/expenses/", response_model=List[schemas.Expense])
async def get_expenses(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Expense).filter(models.Expense.user_id == current_user.id)
    
    if start_date:
        query = query.filter(models.Expense.date >= start_date)
    if end_date:
        query = query.filter(models.Expense.date <= end_date)
    if category:
        query = query.filter(models.Expense.category == category)
    
    return query.order_by(models.Expense.date.desc()).all()

@app.post("/api/expenses/", response_model=schemas.Expense)
async def create_expense(
    expense: schemas.ExpenseCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        db_expense = models.Expense(**expense.model_dump(), user_id=current_user.id)
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        return db_expense
    except Exception as e:
        logger.error(f"Error creating expense: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/expenses/{expense_id}", response_model=schemas.Expense)
async def update_expense(
    expense_id: int,
    expense: schemas.ExpenseCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.user_id == current_user.id
    ).first()
    
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    for key, value in expense.model_dump().items():
        setattr(db_expense, key, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.delete("/api/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_expense = db.query(models.Expense).filter(
        models.Expense.id == expense_id,
        models.Expense.user_id == current_user.id
    ).first()
    
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(db_expense)
    db.commit()
    return {"message": "Expense deleted successfully"}

# Эндпоинты для доходов
@app.get("/api/incomes/", response_model=List[schemas.Income])
async def get_incomes(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    category: str | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Income).filter(models.Income.user_id == current_user.id)
    
    if start_date:
        query = query.filter(models.Income.date >= start_date)
    if end_date:
        query = query.filter(models.Income.date <= end_date)
    if category:
        query = query.filter(models.Income.category == category)
    
    return query.order_by(models.Income.date.desc()).all()

@app.post("/api/incomes/", response_model=schemas.Income)
async def create_income(
    income: schemas.IncomeCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Creating income with data: {income.model_dump()}")
        db_income = models.Income(**income.model_dump(), user_id=current_user.id)
        db.add(db_income)
        db.commit()
        db.refresh(db_income)
        return db_income
    except Exception as e:
        logger.error(f"Error creating income: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/incomes/{income_id}", response_model=schemas.Income)
async def update_income(
    income_id: int,
    income: schemas.IncomeCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_income = db.query(models.Income).filter(
        models.Income.id == income_id,
        models.Income.user_id == current_user.id
    ).first()
    
    if not db_income:
        raise HTTPException(status_code=404, detail="Income not found")
    
    for key, value in income.model_dump().items():
        setattr(db_income, key, value)
    
    db.commit()
    db.refresh(db_income)
    return db_income

@app.delete("/api/incomes/{income_id}")
async def delete_income(
    income_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_income = db.query(models.Income).filter(
        models.Income.id == income_id,
        models.Income.user_id == current_user.id
    ).first()
    
    if not db_income:
        raise HTTPException(status_code=404, detail="Income not found")
    
    db.delete(db_income)
    db.commit()
    return {"message": "Income deleted successfully"}

@app.get(f"{settings.API_V1_STR}/finance/summary/")
@cache(expire=300)  # Кэширование на 5 минут
async def get_finance_summary(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Оптимизированный запрос с использованием подзапросов
    expenses_subquery = db.query(
        models.Expense.category,
        func.sum(models.Expense.amount).label('amount')
    ).filter(
        models.Expense.user_id == current_user.id,
        models.Expense.date.between(start_date, end_date) if start_date and end_date else True
    ).group_by(models.Expense.category).subquery()

    incomes_subquery = db.query(
        models.Income.category,
        func.sum(models.Income.amount).label('amount')
    ).filter(
        models.Income.user_id == current_user.id,
        models.Income.date.between(start_date, end_date) if start_date and end_date else True
    ).group_by(models.Income.category).subquery()

    total_expenses = db.query(func.sum(expenses_subquery.c.amount)).scalar() or 0
    total_incomes = db.query(func.sum(incomes_subquery.c.amount)).scalar() or 0

    return {
        "total_expenses": total_expenses,
        "total_incomes": total_incomes,
        "net_income": total_incomes - total_expenses,
        "expenses_by_category": [
            {"category": row.category, "amount": row.amount}
            for row in db.query(expenses_subquery).all()
        ],
        "incomes_by_category": [
            {"category": row.category, "amount": row.amount}
            for row in db.query(incomes_subquery).all()
        ]
    }

# Эндпоинты для настроек аренды
@app.get("/api/rent-settings/", response_model=schemas.RentSettings)
async def get_rent_settings(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    settings = db.query(models.RentSettings).filter(models.RentSettings.user_id == current_user.id).first()
    if not settings:
        # Создаем настройки по умолчанию, если их нет
        settings = models.RentSettings(
            user_id=current_user.id,
            amount=0,
            payment_day=1
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@app.post("/api/rent-settings/", response_model=schemas.RentSettings)
async def create_rent_settings(
    settings: schemas.RentSettingsCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_settings = db.query(models.RentSettings).filter(models.RentSettings.user_id == current_user.id).first()
    if db_settings:
        # Обновляем существующие настройки
        for key, value in settings.dict().items():
            setattr(db_settings, key, value)
    else:
        # Создаем новые настройки
        db_settings = models.RentSettings(
            user_id=current_user.id,
            **settings.dict()
        )
        db.add(db_settings)
    
    db.commit()
    db.refresh(db_settings)
    return db_settings

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    ) 