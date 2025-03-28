from database import SessionLocal
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_user():
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже пользователь
        existing_user = db.query(User).filter(User.username == "test").first()
        if existing_user:
            print("Тестовый пользователь уже существует")
            return

        # Создаем нового пользователя
        hashed_password = pwd_context.hash("test123")
        user = User(username="test", hashed_password=hashed_password)
        db.add(user)
        db.commit()
        print("Тестовый пользователь успешно создан")
    except Exception as e:
        print(f"Ошибка при создании пользователя: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user() 