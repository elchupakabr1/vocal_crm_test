from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from fastapi_cache.decorator import cache

from api.deps import get_current_user, get_db
from models import User, Lesson
from schemas.lesson import LessonCreate, LessonUpdate, LessonResponse
from api_config import CACHE_CONFIG

router = APIRouter()

@router.get("/", response_model=List[LessonResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_lessons(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lessons = db.query(Lesson).filter(Lesson.user_id == current_user.id).offset(skip).limit(limit).all()
    return lessons

@router.post("/", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    lesson: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_lesson = Lesson(**lesson.dict(), user_id=current_user.id)
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

@router.get("/{lesson_id}", response_model=LessonResponse)
@cache(expire=CACHE_CONFIG["expire"])
async def read_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.user_id == current_user.id
    ).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson

@router.put("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: int,
    lesson: LessonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.user_id == current_user.id
    ).first()
    if db_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    for key, value in lesson.dict(exclude_unset=True).items():
        setattr(db_lesson, key, value)
    
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id,
        Lesson.user_id == current_user.id
    ).first()
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    db.delete(lesson)
    db.commit()
    return None

@router.get("/student/{student_id}", response_model=List[LessonResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_lessons_by_student(
    student_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lessons = db.query(Lesson).filter(
        Lesson.student_id == student_id,
        Lesson.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return lessons

@router.get("/date/{date}", response_model=List[LessonResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_lessons_by_date(
    date: datetime,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lessons = db.query(Lesson).filter(
        Lesson.date == date,
        Lesson.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return lessons 