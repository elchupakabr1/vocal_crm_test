from fastapi import APIRouter
from config import settings
from typing import Dict, Any
from fastapi.security import OAuth2PasswordBearer
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from datetime import timedelta

# Настройки API
API_V1_STR = "/api"
API_TITLE = "Vocal CRM API"
API_DESCRIPTION = "API для управления вокальной студией"
API_VERSION = "1.0.0"

# Настройки безопасности
SECRET_KEY = "your-secret-key-here"  # Замените на реальный секретный ключ
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Создаем схему OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{API_V1_STR}/token")

# Создаем основной роутер API
api_router = APIRouter(prefix=settings.API_V1_STR)

# Настройки API путей
API_PATHS = {
    "token": "/token",
    "lessons": {
        "base": "/lessons/",
        "by_id": "/lessons/{lesson_id}",
        "by_date": "/lessons/by-date/{date}",
        "by_student": "/lessons/by-student/{student_id}"
    },
    "students": {
        "base": "/students/",
        "by_id": "/students/{student_id}"
    },
    "subscriptions": {
        "base": "/subscriptions/",
        "by_id": "/subscriptions/{subscription_id}",
        "by_student": "/subscriptions/by-student/{student_id}"
    },
    "expenses": {
        "base": "/expenses/",
        "by_id": "/expenses/{expense_id}"
    },
    "incomes": {
        "base": "/incomes/",
        "by_id": "/incomes/{income_id}"
    },
    "finance": {
        "summary": "/finance/summary/"
    },
    "rent_settings": {
        "base": "/rent-settings/"
    }
}

# Настройки CORS
CORS_CONFIG = {
    "allow_origins": ["http://localhost:3000"],  # Разрешаем запросы с фронтенда
    "allow_credentials": True,
    "allow_methods": ["*"],  # Разрешаем все методы
    "allow_headers": ["*", "Authorization"],  # Разрешаем все заголовки и Authorization
}

# Настройки безопасности
SECURITY_CONFIG = {
    "secret_key": SECRET_KEY,
    "algorithm": ALGORITHM,
    "access_token_expire_minutes": ACCESS_TOKEN_EXPIRE_MINUTES,
    "oauth2_scheme": oauth2_scheme
}

# Настройки кэширования
CACHE_CONFIG = {
    "backend": InMemoryBackend(),
    "expire": 300  # 5 минут
}

# Настройки пагинации
PAGINATION_CONFIG = {
    "default_page_size": 10,
    "max_page_size": 100
}

# Инициализация кэша
async def init_cache():
    FastAPICache.init(CACHE_CONFIG["backend"], prefix="vocal-crm-cache") 