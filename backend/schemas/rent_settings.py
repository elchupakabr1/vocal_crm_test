from pydantic import BaseModel

class RentSettingsBase(BaseModel):
    amount: int
    payment_day: int

class RentSettingsCreate(RentSettingsBase):
    pass

class RentSettingsResponse(RentSettingsBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True 