from pydantic import BaseModel

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    password: str | None = None

class User(UserBase):
    id: int

    class Config:
        from_attributes = True 