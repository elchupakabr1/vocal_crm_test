from sqlalchemy import Column, Integer, String, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    remaining_lessons = Column(Integer, default=0)
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Связи
    user = relationship("User", back_populates="students")
    lessons = relationship("Lesson", back_populates="student")
    subscriptions = relationship("Subscription", back_populates="student") 