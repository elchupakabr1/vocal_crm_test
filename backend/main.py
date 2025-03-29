# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
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

load_dotenv()

# Создание таблиц
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://213.226.124.30", "http://213.226.124.30:3000", "http://213.226.124.30:8000"],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600
)

# Добавляем сжатие ответов
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Настройки безопасности
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# Создаем пул потоков для операций с БД
db_pool = ThreadPoolExecutor(max_workers=4)

# Кэширование подключений к БД
@lru_cache(maxsize=1)
def get_db_connection():
    return sqlite3.connect('vocal_schedule.db', check_same_thread=False)

# Модели данных
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    password: str

class Lesson(BaseModel):
    id: Optional[int] = None
    title: str
    start_time: str
    end_time: str
    student_name: str
    notes: Optional[str] = None
    student_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Урок вокала",
                "start_time": "2024-03-28T10:00:00",
                "end_time": "2024-03-28T11:00:00",
                "student_name": "Иван Иванов",
                "notes": "Повторение гамм",
                "student_id": 1
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

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

@app.options("/api/token")
async def options_token():
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": "http://213.226.124.30:3000",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

@app.post("/api/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.username == form_data.username).first()
        if not user or not pwd_context.verify(form_data.password, user.hashed_password):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Incorrect username or password"},
                headers={
                    "Access-Control-Allow-Origin": "http://213.226.124.30:3000",
                    "Access-Control-Allow-Credentials": "true",
                    "WWW-Authenticate": "Bearer"
                }
            )
        
        access_token = create_access_token(data={"sub": user.username})
        return JSONResponse(
            content={"access_token": access_token, "token_type": "bearer"},
            headers={
                "Access-Control-Allow-Origin": "http://213.226.124.30:3000",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    except Exception as e:
        print(f"Error during login: {str(e)}")  # Добавляем логирование
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)},
            headers={
                "Access-Control-Allow-Origin": "http://213.226.124.30:3000",
                "Access-Control-Allow-Credentials": "true"
            }
        )

@app.post("/api/lessons", response_model=schemas.Lesson)
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
        title=lesson.title,
        start_time=lesson.start_time,
        end_time=lesson.end_time,
        student_name=lesson.student_name,
        notes=lesson.notes,
        student_id=lesson.student_id,
        user_id=current_user.id
    )
    db.add(db_lesson)
    
    # Обновляем количество оставшихся занятий
    student.remaining_lessons -= 1
    
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

@app.get("/api/lessons", response_model=List[schemas.Lesson])
async def get_lessons(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lessons = db.query(models.Lesson).filter(models.Lesson.user_id == current_user.id).all()
    return lessons

@app.delete("/api/lessons/{lesson_id}")
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

@app.post("/api/students/", response_model=schemas.Student)
async def create_student(
    student: schemas.StudentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_student = models.Student(**student.dict(), user_id=current_user.id)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@app.get("/api/students/", response_model=List[schemas.Student])
async def read_students(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    students = db.query(models.Student).filter(models.Student.user_id == current_user.id).offset(skip).limit(limit).all()
    return students

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

@app.put("/api/students/{student_id}", response_model=schemas.Student)
async def update_student(
    student_id: int,
    student: schemas.StudentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.user_id == current_user.id
    ).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    
    for key, value in student.dict().items():
        setattr(db_student, key, value)
    
    db.commit()
    db.refresh(db_student)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 