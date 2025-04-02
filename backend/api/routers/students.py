from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi_cache.decorator import cache

from api.deps import get_current_user, get_db
from models import User, Student
from schemas.student import StudentCreate, StudentUpdate, StudentResponse
from api_config import CACHE_CONFIG

router = APIRouter()

@router.get("/", response_model=List[StudentResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    students = db.query(Student).filter(Student.user_id == current_user.id).offset(skip).limit(limit).all()
    return students

@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_student = Student(**student.dict(), user_id=current_user.id)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.get("/{student_id}", response_model=StudentResponse)
@cache(expire=CACHE_CONFIG["expire"])
async def read_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.user_id == current_user.id
    ).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    student: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_student = db.query(Student).filter(
        Student.id == student_id,
        Student.user_id == current_user.id
    ).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    
    for key, value in student.dict(exclude_unset=True).items():
        setattr(db_student, key, value)
    
    db.commit()
    db.refresh(db_student)
    return db_student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.user_id == current_user.id
    ).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(student)
    db.commit()
    return None 