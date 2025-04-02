from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi_cache.decorator import cache

from api.deps import get_current_user, get_db
from models import User, Subscription
from schemas.subscription import SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse
from api_config import CACHE_CONFIG

router = APIRouter()

@router.get("/", response_model=List[SubscriptionResponse])
@cache(expire=CACHE_CONFIG["expire"])
async def read_subscriptions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subscriptions = db.query(Subscription).filter(Subscription.user_id == current_user.id).offset(skip).limit(limit).all()
    return subscriptions

@router.post("/", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    subscription: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_subscription = Subscription(**subscription.dict(), user_id=current_user.id)
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

@router.get("/{subscription_id}", response_model=SubscriptionResponse)
@cache(expire=CACHE_CONFIG["expire"])
async def read_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return subscription

@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: int,
    subscription: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    if db_subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    for key, value in subscription.dict(exclude_unset=True).items():
        setattr(db_subscription, key, value)
    
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    if subscription is None:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    db.delete(subscription)
    db.commit()
    return None 