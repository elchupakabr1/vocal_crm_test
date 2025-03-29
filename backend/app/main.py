from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, schemas
from .database import engine, get_db
import logging
import shutil
import os
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.responses import FileResponse
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Настройки безопасности
SECRET_KEY = "your-secret-key-here"  # В продакшене используйте безопасный ключ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Настройка CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://213.226.124.30:3000",
    "http://213.226.124.30",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/users/change-password")
async def change_password(
    password_data: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@app.post("/students/", response_model=schemas.Student)
def create_student(student: schemas.StudentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        logger.info(f"Received student data: {student.dict()}")
        logger.info(f"Data types: first_name={type(student.first_name)}, last_name={type(student.last_name)}, phone={type(student.phone)}, total_lessons={type(student.total_lessons)}, remaining_lessons={type(student.remaining_lessons)}")
        
        student_data = student.dict()
        student_data["user_id"] = current_user.id
        db_student = models.Student(**student_data)
        logger.info("Created student model")
        db.add(db_student)
        logger.info("Added student to session")
        db.commit()
        logger.info("Committed transaction")
        db.refresh(db_student)
        logger.info(f"Student created successfully with ID: {db_student.id}")
        return db_student
    except Exception as e:
        logger.error(f"Error creating student: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/students/", response_model=List[schemas.Student])
def read_students(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        students = db.query(models.Student).filter(models.Student.user_id == current_user.id).offset(skip).limit(limit).all()
        return students
    except Exception as e:
        logger.error(f"Error fetching students: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/students/{student_id}", response_model=schemas.Student)
def read_student(student_id: int, db: Session = Depends(get_db)):
    try:
        db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if db_student is None:
            raise HTTPException(status_code=404, detail="Student not found")
        return db_student
    except Exception as e:
        logger.error(f"Error fetching student {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/students/{student_id}", response_model=schemas.Student)
def update_student(student_id: int, student: schemas.StudentCreate, db: Session = Depends(get_db)):
    try:
        db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if db_student is None:
            raise HTTPException(status_code=404, detail="Student not found")
        
        for key, value in student.dict().items():
            setattr(db_student, key, value)
        
        db.commit()
        db.refresh(db_student)
        return db_student
    except Exception as e:
        logger.error(f"Error updating student {student_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db)):
    try:
        db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if db_student is None:
            raise HTTPException(status_code=404, detail="Student not found")
        
        db.delete(db_student)
        db.commit()
        return {"message": "Student deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting student {student_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lessons/", response_model=schemas.Lesson)
def create_lesson(lesson: schemas.LessonCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
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
        lesson_data = lesson.dict()
        lesson_data["user_id"] = current_user.id
        db_lesson = models.Lesson(**lesson_data)
        db.add(db_lesson)
        
        # Обновляем количество оставшихся занятий
        student.remaining_lessons -= 1
        
        db.commit()
        db.refresh(db_lesson)
        return db_lesson
    except Exception as e:
        logger.error(f"Error creating lesson: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/lessons/", response_model=List[schemas.Lesson])
def read_lessons(skip: int = 0, limit: int = 100, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        lessons = db.query(models.Lesson).filter(models.Lesson.user_id == current_user.id).offset(skip).limit(limit).all()
        return lessons
    except Exception as e:
        logger.error(f"Error fetching lessons: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/lessons/{lesson_id}/complete")
def mark_lesson_as_completed(lesson_id: int, db: Session = Depends(get_db)):
    try:
        lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        
        if lesson.is_completed:
            raise HTTPException(status_code=400, detail="Lesson is already marked as completed")
        
        lesson.is_completed = True
        db.commit()
        return {"message": "Lesson marked as completed"}
    except Exception as e:
        logger.error(f"Error marking lesson {lesson_id} as completed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/subscriptions/", response_model=schemas.Subscription)
def create_subscription(subscription: schemas.SubscriptionCreate, db: Session = Depends(get_db)):
    try:
        db_subscription = models.Subscription(**subscription.dict())
        db.add(db_subscription)
        db.commit()
        db.refresh(db_subscription)
        return db_subscription
    except Exception as e:
        logger.error(f"Error creating subscription: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/subscriptions/", response_model=List[schemas.Subscription])
def read_subscriptions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        subscriptions = db.query(models.Subscription).offset(skip).limit(limit).all()
        return subscriptions
    except Exception as e:
        logger.error(f"Error fetching subscriptions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def read_subscription(subscription_id: int, db: Session = Depends(get_db)):
    try:
        db_subscription = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
        if db_subscription is None:
            raise HTTPException(status_code=404, detail="Subscription not found")
        return db_subscription
    except Exception as e:
        logger.error(f"Error fetching subscription {subscription_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def update_subscription(subscription_id: int, subscription: schemas.SubscriptionCreate, db: Session = Depends(get_db)):
    try:
        db_subscription = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
        if db_subscription is None:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        for key, value in subscription.dict().items():
            setattr(db_subscription, key, value)
        
        db.commit()
        db.refresh(db_subscription)
        return db_subscription
    except Exception as e:
        logger.error(f"Error updating subscription {subscription_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/subscriptions/{subscription_id}")
def delete_subscription(subscription_id: int, db: Session = Depends(get_db)):
    try:
        db_subscription = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
        if db_subscription is None:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        db.delete(db_subscription)
        db.commit()
        return {"message": "Subscription deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting subscription {subscription_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/database/import")
async def import_database(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для импорта базы данных"
        )
    
    try:
        # Создаем временную директорию для загруженного файла
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        # Сохраняем загруженный файл
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Проверяем, что файл является SQLite базой данных
        if not temp_file_path.endswith('.db'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Файл должен быть SQLite базой данных (.db)"
            )
        
        # Создаем резервную копию текущей базы данных
        backup_path = "vocal_schedule_backup.db"
        shutil.copy2("vocal_schedule.db", backup_path)
        
        try:
            # Заменяем текущую базу данных на новую
            shutil.copy2(temp_file_path, "vocal_schedule.db")
            
            # Пересоздаем сессию базы данных
            database.SessionLocal = database.create_session()
            
            return {"message": "База данных успешно импортирована"}
        except Exception as e:
            # В случае ошибки восстанавливаем резервную копию
            shutil.copy2(backup_path, "vocal_schedule.db")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при импорте базы данных: {str(e)}"
            )
        finally:
            # Удаляем временные файлы
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(backup_path):
                os.remove(backup_path)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при импорте базы данных: {str(e)}"
        )

@app.get("/api/database/export")
async def export_database(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для экспорта базы данных"
        )
    
    try:
        # Создаем временную копию базы данных
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, "vocal_schedule_backup.db")
        shutil.copy2("vocal_schedule.db", temp_file_path)
        
        return FileResponse(
            temp_file_path,
            media_type="application/octet-stream",
            filename="vocal_schedule_backup.db"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при экспорте базы данных: {str(e)}"
        )
    finally:
        # Удаляем временный файл после отправки
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.get("/health")
async def health_check():
    return {"status": "ok"} 