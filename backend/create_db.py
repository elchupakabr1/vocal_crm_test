from database import engine, SessionLocal
from models import Base
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_admin_user(db: Session):
    from models import User
    
    # Проверяем, существует ли уже пользователь admin
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin = User(
            username="admin",
            hashed_password=get_password_hash("admin"),
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Пользователь admin создан успешно!")
    else:
        print("Пользователь admin уже существует!")

def init_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Создаем пользователя admin
    db = SessionLocal()
    create_admin_user(db)
    db.close()

if __name__ == "__main__":
    init_db()
    print("База данных создана успешно!") 