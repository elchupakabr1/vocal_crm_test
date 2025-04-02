from .auth import router as auth_router
from .students import router as students_router
from .lessons import router as lessons_router
from .subscriptions import router as subscriptions_router
from .expenses import router as expenses_router
from .incomes import router as incomes_router
from .rent_settings import router as rent_settings_router
from .finance import router as finance_router

__all__ = [
    "auth_router",
    "students_router",
    "lessons_router",
    "subscriptions_router",
    "expenses_router",
    "incomes_router",
    "rent_settings_router",
    "finance_router"
] 