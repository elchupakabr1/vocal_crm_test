from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User
from api_config import SECURITY_CONFIG

oauth2_scheme = SECURITY_CONFIG["oauth2_scheme"]

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Проверяем, что токен начинается с "Bearer "
        if not token.startswith("Bearer "):
            raise credentials_exception
        
        # Убираем "Bearer " из токена
        token = token[7:]
        
        payload = jwt.decode(
            token,
            SECURITY_CONFIG["secret_key"],
            algorithms=[SECURITY_CONFIG["algorithm"]]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user 