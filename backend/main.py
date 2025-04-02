# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging
from config import settings
from api_config import (
    CORS_CONFIG, API_V1_STR, API_TITLE, 
    API_DESCRIPTION, API_VERSION, init_cache
)
from api.routers import (
    auth_router, students_router, lessons_router,
    subscriptions_router, expenses_router, incomes_router,
    rent_settings_router, finance_router
)

# Настройка логгера
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    openapi_url="/api/openapi.json"
)

# Добавляем middleware для отключения кэширования
@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    **CORS_CONFIG
)

# Добавляем GZip сжатие
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Инициализация кэша
@app.on_event("startup")
async def startup_event():
    await init_cache()

# Включаем роутеры
app.include_router(auth_router, prefix=API_V1_STR)
app.include_router(students_router, prefix=API_V1_STR)
app.include_router(lessons_router, prefix=API_V1_STR)
app.include_router(subscriptions_router, prefix=API_V1_STR)
app.include_router(expenses_router, prefix=API_V1_STR)
app.include_router(incomes_router, prefix=API_V1_STR)
app.include_router(rent_settings_router, prefix=API_V1_STR)
app.include_router(finance_router, prefix=API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 