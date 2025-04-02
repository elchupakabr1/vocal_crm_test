from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    # Связи
    students = relationship("Student", back_populates="user")
    lessons = relationship("Lesson", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    expenses = relationship("Expense", back_populates="user")
    incomes = relationship("Income", back_populates="user")
    rent_settings = relationship("RentSettings", back_populates="user")

    def verify_password(self, plain_password: str) -> bool:
        return pwd_context.verify(plain_password, self.hashed_password) 