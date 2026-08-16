"""Pydantic Schemas — 认证"""

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordForgot(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: str

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    id: int
    email: str
    name_zh: str | None = None
    name_en: str | None = None
    contact_email: str | None = None
    phone: str | None = None
    address: str | None = None
    linkedin_url: str | None = None

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    name_zh: str | None = Field(default=None, max_length=100)
    name_en: str | None = Field(default=None, max_length=100)
    contact_email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    address: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=500)
