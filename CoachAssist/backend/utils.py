"""
utils.py

Utility functions used across the CoachAssist backend.

Handles:
- Password hashing & verification (bcrypt)
- JWT creation & decoding
- Email sending (verification & password reset)
- Environment variable loading

This file currently centralizes security-related logic.
"""

import bcrypt
from jose import jwt, JWTError
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage

#=== LOAD ENVIRONMENT VARIABLES ===

# Loads values from .env file into environment
# Used for:
# - JWT secret
# - SMTP credentials
# - Email configuration

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")

#Debugging prints
print("utils.py imported")
print(f"SECRET_KEY loaded? {'YES' if SECRET_KEY else 'NO'}")
print(f"SECRET_KEY value: {SECRET_KEY}")

ALGORITHM = "HS256" #JWT signing algorithm
TOKEN_EXPIRE_HOURS = 6 #JWT expiration duration

#=== PASSWORD HASHING ===

def hash_password(password: str) -> str:
    """
    Hashes a plain-text password using bcrypt.

    - Automatically salts password
    - Returns encoded string for database storage
    """

    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a plain-text password against a stored bcrypt hash.

    Returns:
    - True if password matches
    - False otherwise
    """

    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False

#=== JWT TOKEN HANDLING ===

def create_token(username: str):
    """
    Creates a signed JWT for authenticated users.

    Payload includes:
    - sub: subject (username)
    - exp: expiration timestamp
    """

    expiration = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expiration}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    """
    Decodes and validates a JWT.

    Returns:
    - Payload dictionary if valid
    - None if invalid or expired
    """

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None

#=== EMAIL SENDING (Verification) ===

def send_verification_email(to_email: str, code: str):
    """
    Sends email verification code to user during signup.

    Uses SMTP over SSL.
    Credentials loaded from environment variables.
    """

    print("=== EMAIL SEND START ===")
    print("SMTP_HOST:", os.getenv("SMTP_HOST"))
    print("SMTP_USER:", os.getenv("SMTP_USER"))

    try:
        msg = EmailMessage()
        msg["Subject"] = "CoachAssist Email Verification"
        msg["From"] = os.getenv("EMAIL_FROM")
        msg["To"] = to_email

        msg.set_content(f"Your verification code is: {code}")

        #Secure SMTP Connection
        with smtplib.SMTP_SSL(
            os.getenv("SMTP_HOST"),
            int(os.getenv("SMTP_PORT"))
        ) as server:
            
            #Debug output 
            server.set_debuglevel(1) 
      
            server.login(
                os.getenv("SMTP_USER"),
                os.getenv("SMTP_PASSWORD")
            )
            server.send_message(msg)

        print("=== EMAIL SENT SUCCESSFULLY ===")

    except Exception as e:
        print("!!! EMAIL FAILED !!!")
        print(e)

#=== EMAIL SENDING (Password Reset)

def send_password_reset_email(to_email: str, code: str):
    """
    Sends password reset code to user.

    Used in:
    - Forgot password flow
    - Logged-in password change flow
    """

    print("=== EMAIL SEND START ===")
    print("SMTP_HOST:", os.getenv("SMTP_HOST"))
    print("SMTP_USER:", os.getenv("SMTP_USER"))

    try:
        msg = EmailMessage()
        msg["Subject"] = "CoachAssist Email Verification"
        msg["From"] = os.getenv("EMAIL_FROM")
        msg["To"] = to_email

        msg.set_content(
            f"Your password reset code is: {code}\n\n"
            "This code will expire in 15 minutes.\n\n"
            "If you did not request a password reset, you can ignore this email."
        )

        with smtplib.SMTP_SSL(
            os.getenv("SMTP_HOST"),
            int(os.getenv("SMTP_PORT"))
        ) as server:
            
            #SMTP debug logging
            server.set_debuglevel(1)

            server.login(
                os.getenv("SMTP_USER"),
                os.getenv("SMTP_PASSWORD")
            )
            server.send_message(msg)

        print("=== EMAIL SENT SUCCESSFULLY ===")

    except Exception as e:
        print("!!! EMAIL FAILED !!!")
        print(e)

    #Potentially unneeded:
    #oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
