from fastapi import APIRouter, HTTPException, Header, Depends
from database import get_db
from schema import SignupSchema, LoginSchema, ProfileUpdateSchema, ForgotPasswordSchema, VerifyEmailSchema
from utils import hash_password, verify_password, create_token, decode_token, send_verification_email
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/auth")

# Middleware to ensure the user is authenticated
def require_user(token: str = Header(None)):
    if not token:
        raise HTTPException(401, "Authorization token missing")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")

    return payload["sub"]  # username


#Signup
@router.post("/signup")
def signup(data: SignupSchema):
    db = get_db()
    cur = db.cursor()

    # Check if user exists
    cur.execute(
        "SELECT id FROM users WHERE username=%s OR email=%s",
        (data.username, data.email)
    )

    if cur.fetchone():
        raise HTTPException(400, "Username or email already in use")

    hashed = hash_password(data.password)

    # Generate email verification code
    verification_code = f"{random.randint(100000, 999999)}"
    verification_expires = datetime.utcnow() + timedelta(minutes=15)

    # Insert new user (email not verified yet)
    cur.execute(
        """
        INSERT INTO users (
            username,
            email,
            password_hash,
            full_name,
            email_verified,
            email_verification_code,
            email_verification_expires
        )
        VALUES (%s, %s, %s, %s, FALSE, %s, %s)
        """,
        (
            data.username,
            data.email,
            hashed,
            data.full_name,
            verification_code,
            verification_expires
        )
    )

    # Send verification email
    send_verification_email(data.email, verification_code)

    db.commit()
    cur.close()
    db.close()

    return {"message": "Account created! Check your email to verify your account."}

#Login
@router.post("/login")
def login(data: LoginSchema):
    print(f"Login attempt for: {data.username}")

    db = get_db()
    cur = db.cursor()

    # Match username OR email
    cur.execute(
        """
        SELECT username, password_hash, email_verified
        FROM users
        WHERE username=%s OR email=%s
        """,
        (data.username, data.username)
    )

    user = cur.fetchone()
    print(f"User found in DB? {user is not None}")

    if not user:
        print("User not found")
        raise HTTPException(401, "Invalid login credentials")

    # Check password
    hashed_pw = user["password_hash"]
    password_valid = verify_password(data.password, hashed_pw)
    print(f"Password valid? {password_valid}")

    if not password_valid:
        print("Password invalid")
        raise HTTPException(401, "Invalid login credentials")

    if not user["email_verified"]:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before logging in."
        )

    token = create_token(user["username"])
    print("Token created successfully")

    return {"token": token, "username": user["username"]}

#Get profile
@router.get("/profile")
def get_profile(username=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        "SELECT username, email, full_name, created_at FROM users WHERE username=%s",
        (username,)
    )

    user = cur.fetchone()

    cur.close()
    db.close()

    if not user:
        raise HTTPException(404, "User not found")

    return user

#Update profile
@router.patch("/profile")
def update_profile(data: ProfileUpdateSchema, username=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    if data.email:
        cur.execute("UPDATE users SET email=%s WHERE username=%s", (data.email, username))

    if data.password:
        hashed = hash_password(data.password)
        cur.execute("UPDATE users SET password_hash=%s WHERE username=%s", (hashed, username))

    if data.full_name:
        cur.execute("UPDATE users SET full_name=%s WHERE username=%s", (data.full_name, username))

    if data.username:
        cur.execute("UPDATE users SET username=%s WHERE username=%s", (data.username, username))
        username = data.username  # update session reference

    db.commit()

    # After updating, fetch the updated profile
    cur.execute(
        "SELECT username, email, full_name, created_at FROM users WHERE username=%s",
        (username,)
    )
    updated_user = cur.fetchone()

    cur.close()
    db.close()

    if not updated_user:
        raise HTTPException(404, "User not found after update")

    return updated_user

#Delete profile
@router.delete("/profile")
def delete_profile(username=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute("DELETE FROM users WHERE username=%s", (username,))

    db.commit()
    cur.close()
    db.close()

    return {"message": "Account deleted"}

#forgot password
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordSchema):
    db = get_db()
    cur = db.cursor()

    # Verify user identity
    cur.execute(
        """
        SELECT id
        FROM users
        WHERE username=%s AND email=%s AND full_name=%s
        """,
        (data.username, data.email, data.full_name)
    )

    user = cur.fetchone()

    if not user:
        cur.close()
        db.close()
        raise HTTPException(404, "User information does not match our records")

    # Update password
    hashed = hash_password(data.new_password)
    cur.execute(
        "UPDATE users SET password_hash=%s WHERE id=%s",
        (hashed, user["id"])
    )

    db.commit()
    cur.close()
    db.close()

    return {"message": "Password reset successful"}

#Verify email by sending code
@router.post("/verify-email")
def verify_email(data: VerifyEmailSchema):
    code = data.code
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, email_verification_expires
        FROM users
        WHERE email_verification_code = %s
        """,
        (code,)
    )

    user = cur.fetchone()

    if not user:
        raise HTTPException(400, "Invalid verification code")

    if user["email_verification_expires"] < datetime.utcnow():
        raise HTTPException(400, "Verification code expired")

    cur.execute(
        """
        UPDATE users
        SET email_verified = TRUE,
            email_verification_code = NULL,
            email_verification_expires = NULL
        WHERE id = %s
        """,
        (user["id"],)
    )

    db.commit()
    cur.close()
    db.close()

    return {"message": "Email successfully verified"}

#Resend verification code
@router.post("/resend-verification")
def resend_verification(email: str):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, email_verified
        FROM users
        WHERE email = %s
        """,
        (email,)
    )

    user = cur.fetchone()

    if not user:
        raise HTTPException(400, "No account found with this email")

    if user["email_verified"]:
        raise HTTPException(400, "Email already verified")

    new_code = f"{random.randint(100000, 999999)}"
    expires = datetime.utcnow() + timedelta(minutes=15)

    cur.execute(
        """
        UPDATE users
        SET email_verification_code = %s,
            email_verification_expires = %s
        WHERE id = %s
        """,
        (new_code, expires, user["id"])
    )

    send_verification_email(email, new_code)

    db.commit()
    cur.close()
    db.close()

    return {"message": "Verification code resent"}