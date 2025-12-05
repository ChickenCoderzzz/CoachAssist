import os
from datetime import datetime, timedelta
import bcrypt
from jose import jwt, JWTError
from dotenv import load_dotenv

# ---- DEBUG: Confirm import + file path ----
print("🔥 utils.py IMPORTED from:", os.path.abspath(__file__))

# ---- Load .env variables ----
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 6

# ---- DEBUG: Show whether the secret was loaded ----
print(f"🔑 SECRET_KEY loaded? {'YES' if SECRET_KEY else 'NO'}")
print(f"🔑 SECRET_KEY value: {SECRET_KEY}")

# ---- Function: Hash password ----
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# ---- Function: Verify password ----
def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

# ---- Function: Create JWT token ----
def create_token(username: str) -> str:
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY is missing — check your .env file!")

    expiration = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": username, "exp": expiration}

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---- Function: Decode token ----
def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
