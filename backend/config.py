from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Основные настройки приложения
    PROJECT_NAME: str = "Vocal CRM"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Настройки сервера
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Настройки CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # React development server
        "http://localhost:8000",  # FastAPI development server
        "http://213.226.124.30",  # IP сервера
        "http://213.226.124.30:3000",  # IP сервера с портом фронтенда
        "http://213.226.124.30:8000",  # IP сервера с портом бэкенда
        # Добавьте здесь домен, если он будет настроен
    ]
    
    # Настройки безопасности
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Настройки базы данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vocal_schedule.db")
    
    # Настройки кэширования
    CACHE_EXPIRE_MINUTES: int = int(os.getenv("CACHE_EXPIRE_MINUTES", "5"))
    
    class Config:
        case_sensitive = True

settings = Settings() 