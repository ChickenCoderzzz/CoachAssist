from fastapi import APIRouter, HTTPException, Header, Depends
from database import get_db
from schema import SignupSchema, LoginSchema, ProfileUpdateSchema
from utils import hash_password, verify_password, create_token, decode_token

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

    # Insert new user
    cur.execute(
        """
        INSERT INTO users (username, email, password_hash, full_name)
        VALUES (%s, %s, %s, %s)
        """,
        (data.username, data.email, hashed, data.full_name)
    )

    db.commit()
    cur.close()
    db.close()

    return {"message": "Account created successfully!"}

#Login
@router.post("/login")
def login(data: LoginSchema):
    print(f"Login attempt for: {data.username}")
    try:
        db = get_db()
        cur = db.cursor()

        # Match username or email
        cur.execute(
            """
            SELECT username, password_hash
            FROM users
            WHERE username=%s OR email=%s
            """,
            (data.username, data.username)   # allow login by username or email
        )

        user = cur.fetchone()
        print(f"User found in DB? {user is not None}")

        if not user:
            print("User not found")
            raise HTTPException(401, "Invalid login credentials")

        password_valid = verify_password(data.password, user[1])
        print(f"Password valid? {password_valid}")

        if not password_valid:
            print("Password invalid")
            raise HTTPException(401, "Invalid login credentials")

        token = create_token(user[0])
        print("Token created successfully")

        return {"token": token, "username": user[0]}
    except Exception as e:
        print(f"Login Logic Error: {e}")
        raise e

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
