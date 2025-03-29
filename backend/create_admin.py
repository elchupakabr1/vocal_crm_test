from app.database import SessionLocal
from app.models import User
from app.main import get_password_hash

def create_admin_user(username: str, email: str, password: str):
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже пользователь с таким именем
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"Пользователь {username} уже существует")
            return

        # Создаем нового администратора
        admin_user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        print(f"Администратор {username} успешно создан")
    except Exception as e:
        print(f"Ошибка при создании администратора: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    username = input("Введите имя пользователя: ")
    email = input("Введите email: ")
    password = input("Введите пароль: ")
    create_admin_user(username, email, password) 