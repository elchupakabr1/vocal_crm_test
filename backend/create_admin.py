from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_admin_user():
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже админ
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print("Администратор уже существует")
            return

        # Создаем нового администратора
        admin_user = User(
            username="admin",
            hashed_password=get_password_hash("admin123")
        )
        db.add(admin_user)
        db.commit()
        print("Администратор успешно создан")
        print("Логин: admin")
        print("Пароль: admin123")
    except Exception as e:
        print(f"Ошибка при создании администратора: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
