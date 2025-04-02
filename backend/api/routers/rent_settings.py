from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi_cache.decorator import cache

from api.deps import get_current_user, get_db
from models import User, RentSettings
from schemas.rent_settings import RentSettingsCreate, RentSettingsResponse
from api_config import CACHE_CONFIG, API_PATHS

router = APIRouter()

@router.get(API_PATHS["rent_settings"]["base"], response_model=RentSettingsResponse)
@cache(expire=CACHE_CONFIG["expire"])
async def get_rent_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(RentSettings).filter(RentSettings.user_id == current_user.id).first()
    if not settings:
        # Создаем настройки по умолчанию, если их нет
        settings = RentSettings(
            user_id=current_user.id,
            amount=0,
            payment_day=1
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.post(API_PATHS["rent_settings"]["base"], response_model=RentSettingsResponse)
async def create_rent_settings(
    settings: RentSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing_settings = db.query(RentSettings).filter(RentSettings.user_id == current_user.id).first()
    if existing_settings:
        # Обновляем существующие настройки
        for key, value in settings.dict().items():
            setattr(existing_settings, key, value)
        db.commit()
        db.refresh(existing_settings)
        return existing_settings
    
    # Создаем новые настройки
    db_settings = RentSettings(**settings.dict(), user_id=current_user.id)
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    return db_settings 