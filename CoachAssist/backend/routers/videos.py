from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.database import get_db
from backend.routers.auth import require_user
from backend.video_providers.youtube import create_youtube_video
from fastapi import UploadFile, File
from backend.video_providers.firebase_storage import upload_video_to_firebase

router = APIRouter(prefix="/videos")


# -------------------------
# Request schema
# -------------------------
class YouTubeVideoSchema(BaseModel):
    youtube_id: str  # Can be full URL or just ID
    filename: str = "Game Film"


# -------------------------
# POST /videos/youtube
# -------------------------



@router.post("/youtube")
def register_youtube_video(
    payload: YouTubeVideoSchema,
    user=Depends(require_user)
):
    db = get_db()
    cur = db.cursor()

    # Extract the video info
    video = create_youtube_video(payload.youtube_id)


    # Validate extraction
    if not video["provider_video_id"]:
        raise HTTPException(400, "Invalid YouTube URL or ID")

    # Insert into DB
    try:
        cur.execute(
            """
            INSERT INTO videos (
                user_id, provider, provider_video_id, playback_url, filename
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, playback_url, filename, created_at
            """,
            (
                user["id"],
                video["provider"],
                video["provider_video_id"],
                video["playback_url"],
                payload.filename
            )
        )
        new_video = cur.fetchone()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(400, f"Failed to register video: {e} database: {db} cur: {cur} video: {video}")
    finally:
        cur.close()
        db.close()

    return new_video


# -------------------------
# GET /videos
# require uid?
# -------------------------
@router.get("")
def list_videos(user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, playback_url, filename, created_at
        FROM videos
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user["id"],)
    )

    videos = cur.fetchall()

    cur.close()
    db.close()

    return videos


#firebase upload
@router.post("/upload")
def upload_video(
    file: UploadFile = File(...),
    user=Depends(require_user)
):
    db = get_db()
    cur = db.cursor()

    try:
        storage_path, signed_url = upload_video_to_firebase(
            file,
            user["id"]
        )

        cur.execute(
            """
            INSERT INTO videos (
                user_id, provider, provider_video_id, playback_url, filename
            )
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, playback_url, filename, created_at
            """,
            (
                user["id"],
                "firebase",
                storage_path,   # use this instead of youtube id
                signed_url,
                file.filename
            )
        )

        new_video = cur.fetchone()
        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(400, f"Upload failed: {e}")

    finally:
        cur.close()
        db.close()

    return new_video