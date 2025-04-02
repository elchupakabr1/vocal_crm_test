from sqlalchemy import Column, Integer, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base

class RentSettings(Base):
    __tablename__ = "rent_settings"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Integer, nullable=False)
    payment_day = Column(Integer, nullable=False)
    
    # Внешние ключи
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Связи
    user = relationship("User", back_populates="rent_settings") 