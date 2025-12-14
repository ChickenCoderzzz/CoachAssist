import bcrypt
from jose import jwt, JWTError
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta

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
