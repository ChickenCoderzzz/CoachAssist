from fastapi import APIRouter, HTTPException, Header, Depends
from datetime import datetime, timedelta
import random

from database import get_db
from schema import (
    SignupSchema,
    LoginSchema,
    VerifyEmailSchema,
    ResendVerificationSchema,
    ForgotPasswordRequestSchema,
    ForgotPasswordVerifySchema,
    VerifyProfilePasswordChangeSchema
)
from utils import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    send_verification_email,
    send_password_reset_email
)

router = APIRouter(prefix="/auth")


# =========================
# HELPERS
# =========================
def normalize_email(email: str) -> str:
    return email.strip().lower()


def generate_code() -> str:
    return f"{random.randint(100000, 999999)}"


# =========================
# AUTH DEPENDENCY (Bearer)
# =========================
def require_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Authorization header missing")

    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization format")

    token = authorization.split(" ")[1]
    payload = decode_token(token)

    if not payload:
        raise HTTPException(401, "Invalid or expired token")

    return payload["sub"]


# =========================
# SIGNUP (PENDING)
# =========================
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


# =========================
# VERIFY EMAIL → CREATE USER
# =========================
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


# =========================
# RESEND SIGNUP VERIFICATION
# =========================
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


# =========================
# LOGIN
# =========================
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


# =========================
# PROFILE (FIXES "Not set")
# =========================
@router.get("/profile")
def get_profile(username=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT username, email, full_name
        FROM users
        WHERE username=%s
        """,
        (username,)
    )
    user = cur.fetchone()

    cur.close()
    db.close()

    if not user:
        raise HTTPException(404, "User not found")

    return user


# =========================
# FORGOT PASSWORD (LOGGED OUT)
# =========================
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


# =========================
# CHANGE PASSWORD (LOGGED IN)
# =========================
@router.post("/profile/request-password-change")
def request_password_change(username=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT id, email FROM users WHERE username=%s", (username,))
    user = cur.fetchone()

    if not user:
        raise HTTPException(404, "User not found")

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
    username=Depends(require_user)
):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, password_reset_expires
        FROM users
        WHERE username=%s AND password_reset_code=%s
        """,
        (username, data.code)
    )
    user = cur.fetchone()

    if not user:
        raise HTTPException(400, "Invalid verification code")

    if user["password_reset_expires"] < datetime.utcnow():
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


# =========================
# DELETE ACCOUNT (FIXES 404)
# =========================
@router.post("/delete-account")
def delete_account(username=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT id FROM users WHERE username=%s", (username,))
    user = cur.fetchone()

    if not user:
        raise HTTPException(404, "User not found")

    cur.execute("DELETE FROM users WHERE id=%s", (user["id"],))

    db.commit()
    cur.close()
    db.close()

    return {"message": "Account deleted successfully"}
