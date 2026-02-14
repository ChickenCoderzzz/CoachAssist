"""
auth_schema.py

Pydantic models used for authentication-related requests.

These schemas validate incoming request bodies for:
- Signup
- Login
- Email verification
- Password reset
- Profile password change

Pydantic automatically:
- Validates types
- Ensures required fields exist
- Validates email formatting via EmailStr
"""

from pydantic import BaseModel, EmailStr
from typing import Optional

#=== SIGNUP SCHEMAS ===

class SignupSchema(BaseModel):
    """
    Data required when a user signs up.

    EmailStr automatically validates email format.
    """

    username: str
    email: EmailStr 
    password: str
    full_name: str 

class PendingSignupSchema(BaseModel):
    """
    Represents signup data before verification.
    Intended for pending_users flow.
    """

    full_name: str
    email: EmailStr
    username: str
    password: str

#=== LOGIN SCHEMAS ===

class LoginSchema(BaseModel):
    """
    Data required for login.

    'username' field can accept:
    - username
    - email
    """

    username: str #username or email
    password: str

#=== EMAIL VERIFICATION SCHEMAS ===

class VerifyEmailSchema(BaseModel):
    """
    Used to verify signup email via 6-digit code.
    """

    code: str

class ResendVerificationSchema(BaseModel):
    """
    Used to request a new verification code.
    """

    email: EmailStr

#=== FORGOT PASSWORD SCHEMAS ===

class ForgotPasswordRequestSchema(BaseModel):
    """
    Step 1 of forgot password:
    User submits email to receive reset code.
    """

    email: EmailStr

class ForgotPasswordVerifySchema(BaseModel):
    """
    Step 2 of forgot password:
    User submits:
    - email
    - verification code
    - new password
    """

    email: EmailStr
    code: str
    new_password: str

#=== LOGGED-IN PASSWORD CHANGE SCHEMA ===

class VerifyProfilePasswordChangeSchema(BaseModel):
    """
    Used when a logged-in user requests a password change.

    Requires:
    - verification code sent to email
    - new password
    """
    
    code: str
    new_password: str


