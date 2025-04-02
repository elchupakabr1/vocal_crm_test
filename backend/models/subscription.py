from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    lessons_count = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    notes = Column(String, nullable=True)
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    
    # Связи
    user = relationship("User", back_populates="subscriptions")
    student = relationship("Student", back_populates="subscriptions") 