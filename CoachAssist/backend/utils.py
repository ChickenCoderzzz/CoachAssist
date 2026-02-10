import bcrypt
from jose import jwt, JWTError
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import smtplib
from email.message import EmailMessage

#Load .env file
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
print("utils.py imported")
print(f"SECRET_KEY loaded? {'YES' if SECRET_KEY else 'NO'}")
print(f"SECRET_KEY value: {SECRET_KEY}")

ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 6

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False

def create_token(username: str):
    expiration = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expiration}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    
def send_verification_email(to_email: str, code: str):
    print("=== EMAIL SEND START ===")
    print("SMTP_HOST:", os.getenv("SMTP_HOST"))
    print("SMTP_USER:", os.getenv("SMTP_USER"))

    try:
        msg = EmailMessage()
        msg["Subject"] = "CoachAssist Email Verification"
        msg["From"] = os.getenv("EMAIL_FROM")
        msg["To"] = to_email

        msg.set_content(f"Your verification code is: {code}")

        with smtplib.SMTP_SSL(
            os.getenv("SMTP_HOST"),
            int(os.getenv("SMTP_PORT"))
        ) as server:
            server.set_debuglevel(1)  # <-- THIS LINE
            server.login(
                os.getenv("SMTP_USER"),
                os.getenv("SMTP_PASSWORD")
            )
            server.send_message(msg)

        print("=== EMAIL SENT SUCCESSFULLY ===")

    except Exception as e:
        print("!!! EMAIL FAILED !!!")
        print(e)

def send_password_reset_email(to_email: str, code: str):
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
            server.set_debuglevel(1)  # <-- THIS LINE
            server.login(
                os.getenv("SMTP_USER"),
                os.getenv("SMTP_PASSWORD")
            )
            server.send_message(msg)

        print("=== EMAIL SENT SUCCESSFULLY ===")

    except Exception as e:
        print("!!! EMAIL FAILED !!!")
        print(e)

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
