from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, func, text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    students = relationship("Student", back_populates="user")
    lessons = relationship("Lesson", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    incomes = relationship("Income", back_populates="user")
    rent_settings = relationship("RentSettings", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    phone = Column(String)
    email = Column(String, nullable=True)
    total_lessons = Column(Integer, default=0)
    remaining_lessons = Column(Integer, default=0)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscription = relationship("Subscription", back_populates="students")
    user = relationship("User", back_populates="students")
    lessons = relationship("Lesson", back_populates="student")

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True))
    duration = Column(Integer)  # в минутах
    student_id = Column(Integer, ForeignKey("students.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_completed = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)

    student = relationship("Student", back_populates="lessons")
    user = relationship("User", back_populates="lessons")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    lessons_count = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.current_timestamp())
    
    students = relationship("Student", back_populates="subscription")
    user = relationship("User", back_populates="subscriptions")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="expenses")

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="incomes")

class RentSettings(Base):
    __tablename__ = "rent_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float, nullable=False)
    payment_day = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="rent_settings")