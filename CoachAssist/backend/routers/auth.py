from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timedelta
import random

from backend.database import get_db
from backend.schemas.auth_schema import (
    SignupSchema,
    LoginSchema,
    VerifyEmailSchema,
    ResendVerificationSchema,
    ForgotPasswordRequestSchema,
    ForgotPasswordVerifySchema,
    VerifyProfilePasswordChangeSchema
)
from backend.utils import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    send_verification_email,
    send_password_reset_email
)

router = APIRouter(prefix="/auth")

# ⬇️ IMPORTANT: auto_error=False
security = HTTPBearer(auto_error=False)

# -------------------------
# Helper functions
# -------------------------

def normalize_email(email: str) -> str:
    return email.strip().lower()

def generate_code() -> str:
    return f"{random.randint(100000, 999999)}"

# -------------------------
# Auth dependency (FINAL)
# -------------------------

def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, username, email
        FROM users
        WHERE username = %s
        """,
        (username,)
    )

    user = cur.fetchone()
    cur.close()
    db.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user  # ✅ always a dict

def require_username(user=Depends(require_user)) -> str:
    return user["username"]

# -------------------------
# Signup / Verification
# -------------------------

@router.post("/signup")
def signup(data: SignupSchema):
    db = get_db()
    cur = db.cursor()

    email = normalize_email(data.email)

    cur.execute(
        "SELECT id FROM users WHERE username=%s OR email=%s",
        (data.username, email)
    )
    if cur.fetchone():
        raise HTTPException(400, "Username or email already in use")

    cur.execute("DELETE FROM pending_users WHERE email=%s", (email,))

    code = generate_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    cur.execute(
        """
        INSERT INTO pending_users
        (full_name, email, username, password_hash, verification_code, verification_expires)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            data.full_name,
            email,
            data.username,
            hash_password(data.password),
            code,
            expires
        )
    )

    send_verification_email(email, code)

    db.commit()
    cur.close()
    db.close()

    return {"message": "Check your email for a verification code."}

@router.post("/verify-email")
def verify_email(data: VerifyEmailSchema):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        "SELECT * FROM pending_users WHERE verification_code=%s",
        (data.code,)
    )
    pending = cur.fetchone()

    if not pending:
        raise HTTPException(400, "Invalid verification code")

    if pending["verification_expires"] < datetime.utcnow():
        raise HTTPException(400, "Verification code expired")

    cur.execute(
        """
        INSERT INTO users (full_name, email, username, password_hash, email_verified)
        VALUES (%s, %s, %s, %s, TRUE)
        """,
        (
            pending["full_name"],
            pending["email"],
            pending["username"],
            pending["password_hash"]
        )
    )

    cur.execute("DELETE FROM pending_users WHERE id=%s", (pending["id"],))

    db.commit()
    cur.close()
    db.close()

    return {"message": "Email verified. You may now log in."}

@router.post("/resend-verification")
def resend_verification(data: ResendVerificationSchema):
    db = get_db()
    cur = db.cursor()

    email = normalize_email(data.email)

    cur.execute("SELECT id FROM pending_users WHERE email=%s", (email,))
    pending = cur.fetchone()

    if not pending:
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            raise HTTPException(400, "Email already verified. Please log in.")
        raise HTTPException(400, "Email not found. Please sign up.")

    code = generate_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    cur.execute(
        """
        UPDATE pending_users
        SET verification_code=%s,
            verification_expires=%s
        WHERE id=%s
        """,
        (code, expires, pending["id"])
    )

    send_verification_email(email, code)

    db.commit()
    cur.close()
    db.close()

    return {"message": "Verification code resent."}

# -------------------------
# Login / Profile
# -------------------------

@router.post("/login")
def login(data: LoginSchema):
    db = get_db()
    cur = db.cursor()

    identifier = normalize_email(data.username)

    cur.execute(
        """
        SELECT username, password_hash
        FROM users
        WHERE username=%s OR email=%s
        """,
        (data.username, identifier)
    )
    user = cur.fetchone()

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid login credentials")

    token = create_token(user["username"])

    cur.close()
    db.close()

    return {"token": token}

@router.get("/profile")
def get_profile(user=Depends(require_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"]
    }

# -------------------------
# Forgot Password
# -------------------------

@router.post("/forgot-password/request")
def forgot_password_request(data: ForgotPasswordRequestSchema):
    db = get_db()
    cur = db.cursor()

    email = normalize_email(data.email)

    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    user = cur.fetchone()

    if not user:
        return {"message": "If an account exists, a reset code has been sent."}

    code = generate_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    cur.execute(
        """
        UPDATE users
        SET password_reset_code=%s,
            password_reset_expires=%s
        WHERE id=%s
        """,
        (code, expires, user["id"])
    )

    send_password_reset_email(email, code)

    db.commit()
    cur.close()
    db.close()

    return {"message": "Password reset code sent."}

@router.post("/forgot-password/verify")
def forgot_password_verify(data: ForgotPasswordVerifySchema):
    db = get_db()
    cur = db.cursor()

    email = normalize_email(data.email)

    cur.execute(
        """
        SELECT id, password_reset_expires
        FROM users
        WHERE email=%s AND password_reset_code=%s
        """,
        (email, data.code)
    )
    user = cur.fetchone()

    if not user:
        raise HTTPException(400, "Invalid reset code")

    if user["password_reset_expires"] < datetime.utcnow():
        raise HTTPException(400, "Reset code expired")

    cur.execute(
        """
        UPDATE users
        SET password_hash=%s,
            password_reset_code=NULL,
            password_reset_expires=NULL
        WHERE id=%s
        """,
        (hash_password(data.new_password), user["id"])
    )

    db.commit()
    cur.close()
    db.close()

    return {"message": "Password reset successful"}

# -------------------------
# Logged-in Password Change
# -------------------------

@router.post("/profile/request-password-change")
def request_password_change(user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    code = generate_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    cur.execute(
        """
        UPDATE users
        SET password_reset_code=%s,
            password_reset_expires=%s
        WHERE id=%s
        """,
        (code, expires, user["id"])
    )

    send_password_reset_email(user["email"], code)

    db.commit()
    cur.close()
    db.close()

    return {"message": "Verification code sent."}

@router.post("/profile/verify-password-change")
def verify_password_change(
    data: VerifyProfilePasswordChangeSchema,
    user=Depends(require_user)
):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT password_reset_expires
        FROM users
        WHERE id=%s AND password_reset_code=%s
        """,
        (user["id"], data.code)
    )
    record = cur.fetchone()

    if not record:
        raise HTTPException(400, "Invalid verification code")

    if record["password_reset_expires"] < datetime.utcnow():
        raise HTTPException(400, "Verification code expired")

    cur.execute(
        """
        UPDATE users
        SET password_hash=%s,
            password_reset_code=NULL,
            password_reset_expires=NULL
        WHERE id=%s
        """,
        (hash_password(data.new_password), user["id"])
    )

    db.commit()
    cur.close()
    db.close()

    return {"message": "Password updated successfully"}

# -------------------------
# Delete Account
# -------------------------

@router.post("/delete-account")
def delete_account(user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute("DELETE FROM users WHERE id=%s", (user["id"],))

    db.commit()
    cur.close()
    db.close()

    return {"message": "Account deleted successfully"}
