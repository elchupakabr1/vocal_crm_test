from fastapi import APIRouter
from .routers import (
    auth,
    lessons,
    students,
    subscriptions,
    finance,
    rent_settings
)

api_router = APIRouter()

# Подключаем роутеры без префикса, так как он добавляется в main.py
api_router.include_router(auth.router, prefix="", tags=["auth"])
api_router.include_router(lessons.router, prefix="", tags=["lessons"])
api_router.include_router(students.router, prefix="", tags=["students"])
api_router.include_router(subscriptions.router, prefix="", tags=["subscriptions"])
api_router.include_router(finance.router, prefix="", tags=["finance"])
api_router.include_router(rent_settings.router, prefix="", tags=["rent_settings"]) 