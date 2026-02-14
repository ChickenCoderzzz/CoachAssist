"""
auth.py

Handles all authentication-related routes for CoachAssist:
- Signup & email verification
- Login & profile retrieval
- Password reset (forgot password)
- Logged-in password change
- Account deletion

Implements JWT-based authentication using HTTP Bearer tokens.
"""

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

#Prefix routes with /auth
router = APIRouter(prefix="/auth")

#Security scheme extracts Bearer tokens from headers
security = HTTPBearer(auto_error=False)


#HELPER FUNCTIONS

def normalize_email(email: str) -> str:
    """
    Normalize email to avoid case/spacing issues
    Ensures consistent database storage
    """

    return email.strip().lower()

def generate_code() -> str:
    """
    Generate 6 digit verification code for email verification and password resets
    """

    return f"{random.randint(100000, 999999)}"

#AUTHENTICATION DEPENDENCY

def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Dependency protects routes
    
    -Extract JWT from Authorization Header
    -Decode and validate token
    -Retrieve corresponding user from database
    -Return user record if valid
    """

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

    #Fetch authenticated user
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

    return user  


# SIGNUP / EMAIL VERIFICATION

@router.post("/signup")
def signup(data: SignupSchema):
    """
    Registration Step 1:
     
    -Check for duplicate username/email
    -Store user in pending_users table
    -Send verification code via email
    """

    db = get_db()
    cur = db.cursor()

    email = normalize_email(data.email)

    #Ensure username/email not in use
    cur.execute(
        "SELECT id FROM users WHERE username=%s OR email=%s",
        (data.username, email)
    )
    if cur.fetchone():
        raise HTTPException(400, "Username or email already in use")

    #Remove pending signup with same email
    cur.execute("DELETE FROM pending_users WHERE email=%s", (email,))

    code = generate_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    #Insert into temporary pending_users table
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
    """
    Registration Step 2:
    
    -Validate verifiaction code
    -Move users from pending_users to users
    -Marks email as verified
    """

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

    #Move user to permanent users table
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

    #Remove from pending table
    cur.execute("DELETE FROM pending_users WHERE id=%s", (pending["id"],))

    db.commit()
    cur.close()
    db.close()

    return {"message": "Email verified. You may now log in."}

@router.post("/resend-verification")
def resend_verification(data: ResendVerificationSchema):
    """
    Resends verification code if:
    
    -Email exists in pending users
    -Email not verified
    """

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

# LOGIN / PROFILE
@router.post("/login")
def login(data: LoginSchema):
    """
    Authenticates user by username or email
    Returns JWT token if credentials are valid
    """

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
    """
    Returns authenticated user's basic profile info
    """

    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"]
    }


#FORGOT PASSWORD

@router.post("/forgot-password/request")
def forgot_password_request(data: ForgotPasswordRequestSchema):
    """
    Initiate password reset

    -Generate reset code
    -Email user
    -Store expiration in database
    """

    db = get_db()
    cur = db.cursor()

    email = normalize_email(data.email)

    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    user = cur.fetchone()

    #Generic message for security
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

# LOGGED IN PASSWORD CHANGE

@router.post("/profile/request-password-change")
def request_password_change(user=Depends(require_user)):
    """
    Initiate password reset when logged in

    -Generate reset code
    -Email user
    -Store expiration in database
    """
    
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


#DELETE ACCOUNT
@router.post("/delete-account")
def delete_account(user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute("DELETE FROM users WHERE id=%s", (user["id"],))

    db.commit()
    cur.close()
    db.close()

    return {"message": "Account deleted successfully"}
