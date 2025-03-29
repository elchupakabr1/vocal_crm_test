from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    phone = Column(String)
    total_lessons = Column(Integer, default=0)
    remaining_lessons = Column(Integer, default=0)
    
    lessons = relationship("Lesson", back_populates="student")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    student_name = Column(String)
    notes = Column(String, nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    student = relationship("Student", back_populates="lessons")