from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt

from api.deps import get_db
from models import User
from api_config import SECURITY_CONFIG

router = APIRouter()

@router.post("/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not user.verify_password(form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Вычисляем время истечения токена
    expire = datetime.utcnow() + timedelta(minutes=SECURITY_CONFIG["access_token_expire_minutes"])
    
    # Создаем payload с username вместо id
    to_encode = {
        "sub": user.username,
        "exp": int(expire.timestamp())
    }
    
    access_token = jwt.encode(
        to_encode,
        SECURITY_CONFIG["secret_key"],
        algorithm=SECURITY_CONFIG["algorithm"]
    )
    
    return {"access_token": access_token, "token_type": "bearer"} 