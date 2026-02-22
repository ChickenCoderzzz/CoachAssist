from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from backend.database import get_db
from backend.routers.auth import require_user
from backend.video_providers.youtube import create_youtube_video
from fastapi import UploadFile, File
from backend.video_providers.firebase_storage import upload_video_to_firebase, bucket
#old router
#router = APIRouter(prefix="/videos")
#new router
router = APIRouter(
    prefix="/teams/{team_id}/matches/{match_id}/videos",
    tags=["Match Videos"]
)

#verify that the match is owned by the requester and is avaliable to store videos under
def verify_match_ownership(team_id: int, match_id: int, user_id: int):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT m.id
        FROM matches m
        JOIN teams t ON m.team_id = t.id
        WHERE m.id = %s
          AND m.team_id = %s
          AND t.user_id = %s
        """,
        (match_id, team_id, user_id)
    )

    result = cur.fetchone()

    cur.close()
    db.close()

    if not result:
        raise HTTPException(status_code=404, detail="Match not found or unauthorized")



# -------------------------
# Request schema
# -------------------------
class YouTubeVideoSchema(BaseModel):
    youtube_id: str  # Can be full URL or just ID
    filename: str = "Game Film"


# -------------------------
# POST /videos/youtube
# -------------------------


#deprecated
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


@router.get("")
def list_videos(
    team_id: int,
    match_id: int,
    user=Depends(require_user)
):
    verify_match_ownership(team_id, match_id, user["id"])

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, provider, provider_video_id, storage_path, filename, created_at
        FROM videos
        WHERE user_id = %s
          AND team_id = %s
          AND match_id = %s
        ORDER BY created_at DESC
        """,
        (user["id"], team_id, match_id)
    )

    rows = cur.fetchall()
    cur.close()
    db.close()

    videos = []

    for row in rows:
        playback_url = None

        if row["provider"] == "youtube":
            playback_url = f"https://www.youtube.com/watch?v={row['provider_video_id']}"

        elif row["provider"] == "firebase":
            blob = bucket.blob(row["storage_path"])
            playback_url = blob.generate_signed_url(
                expiration=timedelta(hours=4),
                method="GET"
            )

        videos.append({
            "id": row["id"],
            "filename": row["filename"],
            "playback_url": playback_url,
            "created_at": row["created_at"]
        })

    return videos


#firebase upload
@router.post("")
def upload_video(
    team_id: int,
    match_id: int,
    file: UploadFile = File(...),
    user=Depends(require_user)
):
    #verify that the team,match,and user are correct
    verify_match_ownership(team_id, match_id, user["id"])

    db = get_db()
    cur = db.cursor()

    try:
        storage_path = upload_video_to_firebase(
            file,
            user["id"],
            match_id
        )[0]

        cur.execute(
                       """
            INSERT INTO videos (
                user_id,
                team_id,
                match_id,
                provider,
                provider_video_id,
                storage_path,
                filename
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, filename, created_at
            """,
            (
                user["id"],
                team_id,
                match_id,
                "firebase",
                None,
                storage_path,
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


#delete method
@router.delete("/{video_id}")
def delete_video(
    team_id: int,
    match_id: int,
    video_id: int,
    user=Depends(require_user)
):
    verify_match_ownership(team_id, match_id, user["id"])

    db = get_db()
    cur = db.cursor()

    try:
        # Get video details before deleting
        cur.execute(
            """
            SELECT provider, storage_path
            FROM videos
            WHERE id = %s
                AND user_id = %s
                AND team_id = %s
                AND match_id = %s
            """,
            (video_id, user["id"], team_id, match_id)
        )

        video = cur.fetchone()

        if not video:
            raise HTTPException(status_code=404, detail="Video not found")

        # Delete from Firebase if applicable
        if video["provider"] == "firebase" and video["storage_path"]:
            try:
                blob = bucket.blob(video["storage_path"])
                blob.delete()
            except Exception as firebase_error:
                print(f"Warning: Failed to delete blob from Firebase: {firebase_error}")

        # Delete from database
        cur.execute(
            """
            DELETE FROM videos
            WHERE id = %s
                AND user_id = %s
            """,
            (video_id, user["id"])
        )

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to delete video: {str(e)}")

    finally:
        cur.close()
        db.close()

    return {"message": "Video deleted successfully"}