from fastapi import FastAPI, HTTPException, Depends, status
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
    allow_origins=["*"],  # В продакшене замените на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Добавляем сжатие ответов
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Настройки безопасности
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Урок вокала",
                "start_time": "2024-03-28T10:00:00",
                "end_time": "2024-03-28T11:00:00",
                "student_name": "Иван Иванов",
                "notes": "Повторение гамм"
            }
        }

# Функции для работы с базой данных
def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            hashed_password TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            student_name TEXT NOT NULL,
            notes TEXT
        )
    ''')
    conn.commit()

# Функции для работы с токенами
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Инициализация базы данных
init_db()

# Маршруты API
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT hashed_password FROM users WHERE username = ?', (form_data.username,))
    result = c.fetchone()
    
    if not result or not pwd_context.verify(form_data.password, result[0]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/lessons")
async def create_lesson(lesson: Lesson):
    try:
        print(f"Received lesson data: {lesson}")  # Для отладки
        
        loop = asyncio.get_event_loop()
        conn = get_db_connection()
        c = conn.cursor()
        
        # Преобразуем строки в datetime
        start_time = datetime.strptime(lesson.start_time, "%Y-%m-%dT%H:%M:%S")
        end_time = datetime.strptime(lesson.end_time, "%Y-%m-%dT%H:%M:%S")
        
        print(f"Converted times: start={start_time}, end={end_time}")  # Для отладки
        
        await loop.run_in_executor(
            db_pool,
            lambda: c.execute(
                'INSERT INTO lessons (title, start_time, end_time, student_name, notes) VALUES (?, ?, ?, ?, ?)',
                (lesson.title, start_time, end_time, lesson.student_name, lesson.notes)
            )
        )
        conn.commit()
        return {"message": "Lesson created successfully"}
    except Exception as e:
        print(f"Error creating lesson: {str(e)}")  # Для отладки
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )

@app.get("/api/lessons")
async def get_lessons():
    loop = asyncio.get_event_loop()
    conn = get_db_connection()
    c = conn.cursor()
    
    lessons = await loop.run_in_executor(
        db_pool,
        lambda: c.execute('''
            SELECT id, title, start_time, end_time, student_name, notes 
            FROM lessons 
            ORDER BY start_time
        ''').fetchall()
    )
    
    # Преобразуем результаты в список словарей
    return [
        {
            "id": lesson[0],
            "title": lesson[1],
            "start_time": lesson[2],
            "end_time": lesson[3],
            "student_name": lesson[4],
            "notes": lesson[5]
        }
        for lesson in lessons
    ]

@app.delete("/api/lessons/{lesson_id}")
async def delete_lesson(lesson_id: int):
    loop = asyncio.get_event_loop()
    conn = get_db_connection()
    c = conn.cursor()
    
    await loop.run_in_executor(
        db_pool,
        lambda: c.execute('DELETE FROM lessons WHERE id = ?', (lesson_id,))
    )
    conn.commit()
    return {"message": "Lesson deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        workers=4,  # Количество рабочих процессов
        loop="uvloop",  # Использование uvloop для лучшей производительности
        limit_concurrency=1000,  # Ограничение количества одновременных соединений
        timeout_keep_alive=30,  # Таймаут для keep-alive соединений
        access_log=False  # Отключение логов доступа для снижения нагрузки
    ) 