# -*- coding: utf-8 -*-
from database import engine, Base
from models import User, Lesson, Student, Subscription, Expense, Income, RentSettings

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Создание таблиц в базе данных...")
    init_db()
    print("Таблицы успешно созданы!") 