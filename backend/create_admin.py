from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже администратор
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            # Создаем нового администратора
            admin = User(
                username="admin",
                hashed_password=pwd_context.hash("admin")
            )
            db.add(admin)
            db.commit()
            print("Администратор успешно создан!")
            print("Логин: admin")
            print("Пароль: admin")
        else:
            print("Администратор уже существует!")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
