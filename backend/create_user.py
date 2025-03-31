# -*- coding: utf-8 -*-
from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже пользователь admin
        existing_user = db.query(User).filter(User.username == "admin").first()
        if existing_user:
            print("Admin user already exists")
            return

        # Создаем нового пользователя admin
        hashed_password = pwd_context.hash("admin")
        user = User(username="admin", hashed_password=hashed_password)
        db.add(user)
        db.commit()
        print("Admin user created successfully")
    except Exception as e:
        print("Error creating admin user: {}".format(e))
    finally:
        db.close()

def create_test_user():
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже пользователь
        existing_user = db.query(User).filter(User.username == "test").first()
        if existing_user:
            print("Test user already exists")
            return

        # Создаем нового пользователя
        hashed_password = pwd_context.hash("test123")
        user = User(username="test", hashed_password=hashed_password)
        db.add(user)
        db.commit()
        print("Test user created successfully")
    except Exception as e:
        print("Error creating user: {}".format(e))
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
    create_test_user() 