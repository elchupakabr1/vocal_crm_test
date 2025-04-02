from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    amount = Column(Integer, nullable=False)
    category = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Связи
    user = relationship("User", back_populates="expenses") 