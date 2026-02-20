"""
photo_handler.py

Handles:
- Uploading team photos (logos) to Firebase Storage
- Deleting team photos from Firebase Storage

Features:
- Unique file naming per user
- File type validation (JPEG, PNG, WEBP only)
- File size validation (5MB limit)
- Public URL generation (non-expiring)
- Safe deletion support
- Debug logging for testing

Images stored under:
team_photos/{user_id}/{uuid}.extension
"""

import firebase_admin
from firebase_admin import credentials, storage
from fastapi import HTTPException
import uuid


# =====================================================
# ================= FIREBASE INITIALIZATION ===========
# =====================================================

firebaseProjId = "coachassist-81c87"

cred = credentials.Certificate("backend/firebase_key.json")

# Initialize only once
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred, {
        "storageBucket": firebaseProjId + ".firebasestorage.app"
    })

bucket = storage.bucket()


# =====================================================
# ================= CONFIGURATION =====================
# =====================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

MAX_FILE_SIZE_MB = 5


# =====================================================
# ================= UPLOAD FUNCTION ===================
# =====================================================

def upload_photo_to_firebase(file_obj, user_id: int):
    """
    Uploads a validated image to Firebase Storage.

    Parameters:
    - file_obj: FastAPI UploadFile object
    - user_id: ID of authenticated user

    Returns:
    - storage_path (str): Firebase internal storage path
    - public_url (str): Permanent public URL
    """

    print("=== PHOTO UPLOAD START ===")
    print("User ID:", user_id)
    print("Filename:", file_obj.filename)
    print("Content Type:", file_obj.content_type)

    # Validate file type
    if file_obj.content_type not in ALLOWED_IMAGE_TYPES:
        print("❌ Invalid file type")
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, or WEBP images are allowed."
        )

    # Validate file size
    file_obj.file.seek(0, 2)
    file_size = file_obj.file.tell()
    file_obj.file.seek(0)

    print("File Size (bytes):", file_size)

    if file_size > MAX_FILE_SIZE_MB * 1024 * 1024:
        print("❌ File too large")
        raise HTTPException(
            status_code=400,
            detail="Image must be under 5MB."
        )

    # Generate unique storage path
    file_extension = file_obj.filename.split(".")[-1]
    unique_name = f"team_photos/{user_id}/{uuid.uuid4()}.{file_extension}"

    print("Firebase Path:", unique_name)

    blob = bucket.blob(unique_name)

    # Upload file
    blob.upload_from_file(
        file_obj.file,
        content_type=file_obj.content_type
    )

    # Make file public (non-expiring URL)
    blob.make_public()

    print("✅ Upload Success")
    print("Public URL:", blob.public_url)
    print("=== PHOTO UPLOAD END ===")

    return unique_name, blob.public_url


# =====================================================
# ================= DELETE FUNCTION ===================
# =====================================================

def delete_photo_from_firebase(storage_path: str):
    """
    Deletes a photo from Firebase Storage using its storage path.
    """

    if not storage_path:
        return

    print("=== PHOTO DELETE START ===")
    print("Deleting:", storage_path)

    try:
        blob = bucket.blob(storage_path)
        blob.delete()
        print("✅ Image deleted successfully")
    except Exception as e:
        print("⚠️ Failed to delete image:", str(e))

    print("=== PHOTO DELETE END ===")