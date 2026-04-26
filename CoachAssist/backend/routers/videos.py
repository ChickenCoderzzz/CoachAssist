from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from backend.database import get_db
from backend.routers.auth import require_user
from backend.video_providers.youtube import create_youtube_video
from fastapi import UploadFile, File
from backend.video_providers.firebase_storage import upload_video_to_firebase, bucket
from backend.upscaling_utils.realesrgan import REALSRCAN_BIN, REALSRCAN_DIR
import subprocess
import tempfile
import requests
import os
import uuid
import logging
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#old router
#router = APIRouter(prefix="/videos")
#new router
router = APIRouter(
    prefix="/teams/{team_id}/matches/{match_id}/videos",
    tags=["Match Videos"]
)
#resumable blob uploads will allow the upload progress to be visible 
#Firebase SDK is meant to work on the frontend, so it would mean a total change in our architecture
def upload_video_with_progress(file_path, blob, job_id=None, cur=None, db=None,
                         base_progress=0, progress_span=100):

    file_size = os.path.getsize(file_path)

    session_url = blob.create_resumable_upload_session(
        content_type="video/mp4"
    )
    # 2MB 
    # chunk_size = 2 * 1024 * 1024  
    # 256KB
    chunk_size = 256 * 1024  
    uploaded = 0

    with open(file_path, "rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break

            start = uploaded
            end = uploaded + len(chunk) - 1

            headers = {
                "Content-Type": "video/mp4",
                "Content-Range": f"bytes {start}-{end}/{file_size}"
            }

            response = requests.put(session_url, data=chunk, headers=headers)

            if response.status_code not in (200, 201, 308):
                raise Exception(f"Upload failed: {response.text}")

            uploaded += len(chunk)

            #progress tracking
            if job_id and cur and db:
                pct = uploaded / file_size
                progress = base_progress + int(pct * progress_span)

                update_upload_job(cur, job_id, progress=progress, step="uploading")
                db.commit()

#background task for video uploading
def process_video_upload(user_id, team_id, match_id, video_id, job_id, temp_path, original_filename):
    db = get_db()
    cur = db.cursor()

    try:
        update_upload_job(cur, job_id, status="processing", progress=10, step="uploading")
        db.commit()

        filename = f"{user_id}_{match_id}_{original_filename}"
        storage_path = f"users/{user_id}/matches/{match_id}/{filename}"

        blob = bucket.blob(storage_path)

        upload_video_with_progress(
            temp_path,
            blob,
            job_id=job_id,
            cur=cur,
            db=db,
            base_progress=10,
            progress_span=80
        )

        blob.content_type = "video/mp4"
        blob.patch()

        # update video record
        cur.execute(
            """
            UPDATE videos
            SET storage_path = %s
            WHERE id = %s
            """,
            (storage_path, video_id)
        )

        update_upload_job(cur, job_id, status="done", progress=100, step="completed")
        db.commit()

    except Exception as e:
        update_upload_job(cur, job_id, status="failed", step=str(e)[:100])
        db.commit()

    finally:
        cur.close()
        db.close()


#background task for video clipping
def process_clip_video(
    user_id,
    team_id,
    match_id,
    source_video_id,
    job_id,
    start,
    end
):
    db = get_db()
    cur = db.cursor()

    try:
        update_upload_job(cur, job_id, status="processing", progress=5, step="downloading")
        db.commit()

        # fetch source video
        cur.execute("""
            SELECT storage_path, filename
            FROM videos
            WHERE id = %s AND user_id = %s AND team_id = %s AND match_id = %s
        """, (source_video_id, user_id, team_id, match_id))

        video = cur.fetchone()
        if not video:
            raise Exception("Video not found")

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input.mp4")
            output_path = os.path.join(tmpdir, "clip.mp4")

            # download
            blob = bucket.blob(video["storage_path"])
            blob.download_to_filename(input_path)

            update_upload_job(cur, job_id, progress=20, step="clipping")
            db.commit()

            duration = end - start

            # clip with ffmpeg
            result = subprocess.run([
                "ffmpeg",
                "-ss", str(start),
                "-i", input_path,
                "-t", str(duration),
                "-c", "copy",
                output_path
            ], capture_output=True)

            if result.returncode != 0:
                raise RuntimeError(result.stderr.decode())

            update_upload_job(cur, job_id, progress=40, step="uploading")
            db.commit()

            # upload with progress
            clip_filename = f"clip_{uuid.uuid4().hex}.mp4"
            storage_path = f"users/{user_id}/matches/{match_id}/{clip_filename}"

            blob_out = bucket.blob(storage_path)

            upload_video_with_progress(
                output_path,
                blob_out,
                job_id=job_id,
                cur=cur,
                db=db,
                base_progress=40,
                progress_span=50  # 40 → 90
            )

            blob_out.content_type = "video/mp4"
            blob_out.patch()

        # insert DB record
        update_upload_job(cur, job_id, progress=90, step="saving")
        db.commit()

        cur.execute("""
            INSERT INTO videos (
                user_id, team_id, match_id,
                provider, provider_video_id,
                storage_path, filename
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            team_id,
            match_id,
            "firebase",
            None,
            storage_path,
            clip_filename
        ))

        update_upload_job(cur, job_id, status="done", progress=100, step="completed")
        db.commit()
        logger.info(f"[CLIP] job {job_id} completed")

    except Exception as e:
        update_upload_job(cur, job_id, status="failed", step=str(e)[:100])
        db.commit()

    finally:
        cur.close()
        db.close()

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

#update an ongoing job to reflect progress
def update_upload_job(cur, job_id, status=None, progress=None, step=None):
    try:
        cur.execute(
            """
            UPDATE upload_jobs
            SET status = COALESCE(%s, status),
                progress = COALESCE(%s, progress),
                step = COALESCE(%s, step)
            WHERE id = %s
            """,
            (status, progress, step, job_id)
        )
    except Exception as e:
        logger.error(f"[UPSCALE] Update failed for job={job_id}: {e}", exc_info=True)
def update_upscale_job(cur, job_id, status=None, progress=None, step=None):
    try:
        cur.execute(
            """
            UPDATE upscale_jobs
            SET status = COALESCE(%s, status),
                progress = COALESCE(%s, progress),
                step = COALESCE(%s, step)
            WHERE id = %s
            """,
            (status, progress, step, job_id)
        )
    except Exception as e:
        logger.error(f"[UPSCALE] Update failed for job={job_id}: {e}", exc_info=True)

#upscale video in background
def process_upscale_video_in_background(user_id: int, team_id: int, match_id: int, video_id: int, job_id: int):
    db = get_db()
    cur = db.cursor()
    
    logger.info(f"[UPSCALE] Starting upscale for user={user_id}, video={video_id}")
    #update job to reflect that it has begun
    update_upscale_job(cur, job_id, status="processing", progress=5, step="downloading")
    db.commit()
    try:
        cur.execute(
            """
            SELECT storage_path, filename
            FROM videos
            WHERE id = %s
              AND user_id = %s
              AND team_id = %s
              AND match_id = %s
            """,
            (video_id, user_id, team_id, match_id)
        )

        video = cur.fetchone()
        if not video or not video["storage_path"]:
            update_upscale_job(cur, job_id, status="failed", step="video not found")
            db.commit()
            logger.error(f"[UPSCALE] Video not found or missing storage_path: {video}")
            return

        logger.info(f"[UPSCALE] Found video: {video['filename']}, storage_path={video['storage_path']}")

        with tempfile.TemporaryDirectory() as tmpdir:
            input_path = os.path.join(tmpdir, "input.mp4")
            frames_dir = os.path.join(tmpdir, "frames")
            upscaled_dir = os.path.join(tmpdir, "upscaled")
            output_path = os.path.join(tmpdir, "output.mp4")

            os.makedirs(frames_dir, exist_ok=True)
            os.makedirs(upscaled_dir, exist_ok=True)

            logger.info(f"[UPSCALE] Created temp dirs: input={input_path}, frames={frames_dir}, upscaled={upscaled_dir}, output={output_path}")

            # Step 1: Download from Firebase
            try:
                logger.info(f"[UPSCALE] Downloading video from Firebase: {video['storage_path']}")
                
                blob = bucket.blob(video["storage_path"])
                blob.download_to_filename(input_path)
                logger.info(f"[UPSCALE] Successfully downloaded video ({os.path.getsize(input_path)} bytes)")
            except Exception as e:
                logger.error(f"[UPSCALE] Firebase download failed: {e}")
                raise
            # update job to reflect that the current stage is frame extraction
            update_upscale_job(cur, job_id, progress=20, step="extracting_frames")
            db.commit()
            # Step 2: Extract frames
            try:
                logger.info(f"[UPSCALE] Extracting frames from video...")
                result = subprocess.run(
                    ["ffmpeg", "-i", input_path, f"{frames_dir}/frame_%04d.png"],
                    capture_output=True,
                    text=True,
                    check=False
                )
                if result.returncode != 0:
                    logger.error(f"[UPSCALE] ffmpeg frame extraction failed: {result.stderr}")
                    raise RuntimeError(f"ffmpeg frame extraction failed: {result.stderr}")
                frame_count = len([f for f in os.listdir(frames_dir) if f.endswith('.png')])
                logger.info(f"[UPSCALE] Successfully extracted {frame_count} frames")
            except Exception as e:
                logger.error(f"[UPSCALE] Frame extraction failed: {e}")
                raise
            # update job to reflect that the current stage is upscaling frames
            update_upscale_job(cur, job_id, progress=40, step="upscaling_frames")
            db.commit()
            # Step 3: Upscale frames
            try:
                logger.info(f"[UPSCALE] Upscaling {frame_count} frames using Real-ESRGAN (model: realesrgan-x4plus)...")
                logger.info(f"[UPSCALE] REALSRCAN_BIN={REALSRCAN_BIN}, REALSRCAN_DIR={REALSRCAN_DIR}")
                
                if not os.path.exists(REALSRCAN_BIN):
                    raise RuntimeError(f"Real-ESRGAN binary not found at {REALSRCAN_BIN}")
                
                result = subprocess.run([
                    REALSRCAN_BIN,
                    "-i", frames_dir,
                    "-o", upscaled_dir,
                    "-n", "realesrgan-x4plus",
                    "-m", os.path.join(REALSRCAN_DIR, "models")
                ], cwd=REALSRCAN_DIR, capture_output=True, text=True, check=False)
                
                if result.returncode != 0:
                    logger.error(f"[UPSCALE] Real-ESRGAN failed: {result.stderr}")
                    raise RuntimeError(f"Real-ESRGAN failed: {result.stderr}")
                
                upscaled_count = len([f for f in os.listdir(upscaled_dir) if f.endswith('.png')])
                logger.info(f"[UPSCALE] Successfully upscaled {upscaled_count} frames")
            except Exception as e:
                logger.error(f"[UPSCALE] Upscaling failed: {e}")
                raise
            # update job to reflect that the current stage is rebuilding the video
            update_upscale_job(cur, job_id, progress=70, step="rebuilding_video")
            db.commit()
            # Step 4: Rebuild video
            try:
                logger.info(f"[UPSCALE] Rebuilding video from upscaled frames...")
                result = subprocess.run([
                    "ffmpeg",
                    "-framerate", "30",
                    "-i", f"{upscaled_dir}/frame_%04d.png",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    output_path
                ], capture_output=True, text=True, check=False)
                
                if result.returncode != 0:
                    logger.error(f"[UPSCALE] ffmpeg video rebuild failed: {result.stderr}")
                    raise RuntimeError(f"ffmpeg video rebuild failed: {result.stderr}")
                
                output_size = os.path.getsize(output_path)
                logger.info(f"[UPSCALE] Successfully rebuilt video ({output_size} bytes)")
            except Exception as e:
                logger.error(f"[UPSCALE] Video rebuild failed: {e}")
                raise
            # update job to reflect that the current stage is reuploading video
            update_upscale_job(cur, job_id, progress=80, step="uploading")
            db.commit()
            # Step 5: Upload to Firebase
            try:
                
                logger.info(f"[UPSCALE] Uploading upscaled video to Firebase...")
                upscale_filename = f"upscaled_{uuid.uuid4().hex}.mp4"
                storage_path = f"users/{user_id}/matches/{match_id}/{upscale_filename}"

                blob_out = bucket.blob(storage_path)

                upload_video_with_progress(
                    output_path,
                    blob_out,
                    job_id=job_id,
                    cur=cur,
                    db=db,
                    base_progress=80,   # your existing stage
                    progress_span=10    # goes from 80 → 90
                )

                blob_out.content_type = "video/mp4"
                blob_out.patch()
                logger.info(f"[UPSCALE] Successfully uploaded to Firebase: {storage_path}")
            except Exception as e:
                logger.error(f"[UPSCALE] Firebase upload failed: {e}")
                raise
            # update job to reflect that the current stage is updating the database records
            update_upscale_job(cur, job_id, progress=90, step="updating records")
            db.commit()
            # Step 6: Insert database record
            try:
                logger.info(f"[UPSCALE] Inserting new video record into database...")
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
                    """,
                    (
                        user_id,
                        team_id,
                        match_id,
                        "firebase",
                        None,
                        storage_path,
                        f"Upscaled {video['filename']}"
                    )
                )
                db.commit()
                logger.info(f"[UPSCALE] Successfully inserted video record into database")
            except Exception as e:
                db.rollback()
                logger.error(f"[UPSCALE] Database insert failed: {e}")
                raise
        update_upscale_job(cur, job_id, status="done", progress=100, step="completed")
        db.commit()
        logger.info(f"[UPSCALE] Upscaling completed successfully for video={video_id}")

    except Exception as e:
        logger.error(f"[UPSCALE] Upscaling failed for user={user_id}, video={video_id}: {e}", exc_info=True)
        db.commit()
        update_upscale_job(cur, job_id, status="failed", step=str(e)[:100])

    finally:
        cur.close()
        db.close()


# -------------------------
# Request schema
# -------------------------
class YouTubeVideoSchema(BaseModel):
    youtube_id: str  # Can be full URL or just ID
    filename: str = "Game Film"

#clipping schema
class ClipVideoSchema(BaseModel):
    start: float
    end: float

#renaming schema
class RenameVideoRequest(BaseModel):
    filename: str

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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(require_user)
):
    verify_match_ownership(team_id, match_id, user["id"])

    db = get_db()
    cur = db.cursor()

    temp_path = None

    try:
        # 1. Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_path = tmp.name

        # 2. Create DB record FIRST (placeholder video)
        cur.execute(
            """
            INSERT INTO videos (
                user_id,
                team_id,
                match_id,
                provider,
                storage_path,
                filename
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                user["id"],
                team_id,
                match_id,
                "firebase",
                None,
                file.filename
            )
        )

        video_id = cur.fetchone()["id"]

        # 3. Create upload job
        cur.execute(
            """
            INSERT INTO upload_jobs (
                video_id, user_id, team_id, match_id,
                status, progress, step
            )
            VALUES (%s, %s, %s, %s, 'queued', 0, 'queued')
            RETURNING id
            """,
            (video_id, user["id"], team_id, match_id)
        )

        job_id = cur.fetchone()["id"]

        db.commit()

    finally:
        cur.close()
        db.close()

    # 4. Start background upload
    background_tasks.add_task(
        process_video_upload,
        user["id"],
        team_id,
        match_id,
        video_id,
        job_id,
        temp_path,
        file.filename
    )

    # 5. RETURN IMMEDIATELY
    return {
        "video": {
            "id": video_id,
            "filename": file.filename,
            "playback_url": None
        },
        "job_id": job_id
    }


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

#renaming method
@router.patch("/{video_id}")
def rename_video(
    team_id: int,
    match_id: int,
    video_id: int,
    payload: RenameVideoRequest,
    user=Depends(require_user)
):
    verify_match_ownership(team_id, match_id, user["id"])

    db = get_db()
    cur = db.cursor()

    try:
        cur.execute(
            """
            UPDATE videos
            SET filename = %s
            WHERE id = %s
              AND user_id = %s
              AND team_id = %s
              AND match_id = %s
            RETURNING id, filename, created_at
            """,
            (payload.filename, video_id, user["id"], team_id, match_id)
        )

        updated_video = cur.fetchone()

        if not updated_video:
            raise HTTPException(status_code=404, detail="Video not found")

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to rename video: {str(e)}")

    finally:
        cur.close()
        db.close()

    return updated_video

#clipping method
@router.post("/{video_id}/clip", status_code=202)
def clip_video(
    team_id: int,
    match_id: int,
    video_id: int,
    payload: ClipVideoSchema,
    background_tasks: BackgroundTasks,
    user=Depends(require_user)
):
    verify_match_ownership(team_id, match_id, user["id"])

    if payload.end <= payload.start:
        raise HTTPException(400, "Invalid time range")

    db = get_db()
    cur = db.cursor()

    try:
        # validate source exists
        cur.execute("""
            SELECT id FROM videos
            WHERE id = %s AND user_id = %s AND team_id = %s AND match_id = %s
        """, (video_id, user["id"], team_id, match_id))

        if not cur.fetchone():
            raise HTTPException(404, "Video not found")

        # create upload job
        cur.execute("""
            INSERT INTO upload_jobs (
                video_id, user_id, team_id, match_id,
                status, progress, step
            )
            VALUES (%s, %s, %s, %s, 'queued', 0, 'queued')
            RETURNING id
        """, (video_id, user["id"], team_id, match_id))

        job_id = cur.fetchone()["id"]
        db.commit()
        logger.info(f"[CLIP] Created upload job {job_id}")

    finally:
        cur.close()
        db.close()

    # start background clipping
    background_tasks.add_task(
        process_clip_video,
        user["id"],
        team_id,
        match_id,
        video_id,
        job_id,
        payload.start,
        payload.end
    )

    return {
        "status": "queued",
        "job_id": job_id
    }


#upscaling method
@router.post("/{video_id}/upscale", status_code=202)
def upscale_video(
    team_id: int,
    match_id: int,
    video_id: int,
    background_tasks: BackgroundTasks,
    user=Depends(require_user)
):
    verify_match_ownership(team_id, match_id, user["id"])

    db = get_db()
    cur = db.cursor()

    try:
        # Validate video exists
        cur.execute(
            """
            SELECT id
            FROM videos
            WHERE id = %s
              AND user_id = %s
              AND team_id = %s
              AND match_id = %s
            """,
            (video_id, user["id"], team_id, match_id)
        )
        if not cur.fetchone():
            raise HTTPException(404, "Video not found")
        
        # Check for existing active upscaling job
        cur.execute(
            """
            SELECT id
            FROM upscale_jobs
            WHERE video_id = %s
            AND user_id = %s
            AND status IN ('queued', 'processing')
            LIMIT 1
            """,
            (video_id, user["id"])
        )

        existing_job = cur.fetchone()

        if existing_job:
            cur.close()
            db.close()
            return {
                "status": "already_running",
                "job_id": existing_job["id"]
            }
        
        # create upscaling job to track progress
        cur.execute(
            """
            INSERT INTO upscale_jobs (
                video_id,
                user_id,
                team_id,
                match_id,
                status,
                progress,
                step
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                video_id,
                user["id"],
                team_id,
                match_id,
                "queued",
                0,
                "queued"
            )
        )

        job_id = cur.fetchone()["id"]
        db.commit()

    finally:
        cur.close()
        db.close()

    #start background task
    background_tasks.add_task(
        process_upscale_video_in_background,
        user["id"],
        team_id,
        match_id,
        video_id,
        job_id   
    )

    return {
        "status": "queued",
        "job_id": job_id
    }

#uploading job status endpoint
@router.get("/upload-status/{job_id}")
def get_upload_status(
    job_id: int,
    user=Depends(require_user)
):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT status, progress, step
        FROM upload_jobs
        WHERE id = %s AND user_id = %s
        """,
        (job_id, user["id"])
    )

    job = cur.fetchone()

    cur.close()
    db.close()

    if not job:
        raise HTTPException(404, "Job not found")

    return job

#upscaling job status endpoint
@router.get("/{job_id}/upscale-status")
def get_upscale_status(job_id: int, user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT status, progress, step
        FROM upscale_jobs
        WHERE id = %s AND user_id = %s
        """,
        (job_id, user["id"])
    )

    job = cur.fetchone()

    cur.close()
    db.close()

    if not job:
        raise HTTPException(404, "Job not found")

    return job