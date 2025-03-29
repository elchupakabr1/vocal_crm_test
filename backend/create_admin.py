from app.database import SessionLocal
from app.models import User
from app.security import get_password_hash

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
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            is_admin=True,
            is_active=True
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
