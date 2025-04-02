from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=False)  # в минутах
    is_completed = Column(Boolean, default=False)
    is_cancelled = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Связи
    user = relationship("User", back_populates="lessons")
    student = relationship("Student", back_populates="lessons") 