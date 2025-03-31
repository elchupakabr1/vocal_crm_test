from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    user_id = Column(Integer, unique=True, index=True)

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    phone = Column(String)
    total_lessons = Column(Integer, default=0)
    remaining_lessons = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"))
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    
    lessons = relationship("Lesson", back_populates="student")
    subscription = relationship("Subscription", back_populates="students")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime)
    duration = Column(Integer)
    student_id = Column(Integer, ForeignKey("students.id"))
    is_completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    student = relationship("Student", back_populates="lessons")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    lessons_count = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    students = relationship("Student", back_populates="subscription")