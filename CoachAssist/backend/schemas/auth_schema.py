from pydantic import BaseModel, EmailStr
from typing import Optional

#Data for signing up
class SignupSchema(BaseModel):
    username: str
    email: EmailStr 
    password: str
    full_name: str 

class PendingSignupSchema(BaseModel):
    full_name: str
    email: EmailStr
    username: str
    password: str

#Data for logging in
class LoginSchema(BaseModel):
    username: str #username or email
    password: str

class VerifyEmailSchema(BaseModel):
    code: str

class ResendVerificationSchema(BaseModel):
    email: EmailStr

#Request reset
class ForgotPasswordRequestSchema(BaseModel):
    email: EmailStr

#Confirm reset
class ForgotPasswordVerifySchema(BaseModel):
    email: EmailStr
    code: str
    new_password: str

#Change password from edit profile
class VerifyProfilePasswordChangeSchema(BaseModel):
    code: str
    new_password: str

class PlayerCreateSchema(BaseModel):
    player_name: str
    jersey_number: Optional[int] = None
    unit: Optional[str] = None      # ✅ NEW
    position: Optional[str] = None
    notes: Optional[str] = None

