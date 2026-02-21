"""
teams.py

Handles:
- Team (Folder) management
- Match (Game) management

Features:
- Create, read, update, delete teams
- Optional team photo upload via Firebase
- Automatic image cleanup on replace/delete
- Create, read, update, delete matches
- Ownership verification for all operations

All routes require authentication.
Users can only access teams and matches they own.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from backend.database import get_db
from backend.schemas.match_schema import MatchCreateSchema
from backend.routers.auth import require_user
from backend.video_providers.photo_handler import (
    upload_photo_to_firebase,
    delete_photo_from_firebase
)

# Endpoints prefixed with /teams
router = APIRouter(
    prefix="/teams",
    tags=["Teams"]
)

# =====================================================
# ================= TEAM FOLDER ENDPOINTS =============
# =====================================================

# CREATE A TEAM (supports optional image upload)

@router.post("/")
async def create_team(
    name: str = Form(...),
    description: str = Form(None),
    color: str = Form("#9DBA8A"),  # NEW
    image: UploadFile = File(None),
    user=Depends(require_user)
):
    """
    Creates a new team folder for the authenticated user.
    Each team is owned by a specific user.
    Photo upload is optional.
    """

    image_url = None
    image_path = None

    if image:
        image_path, image_url = upload_photo_to_firebase(image, user["id"])

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        INSERT INTO teams (user_id, name, description, image_url, image_path, color)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id, name, description, image_url, color
        """,
        (user["id"], name, description, image_url, image_path, color)
    )

    row = cur.fetchone()
    db.commit()

    return {"team": dict(row)}


# GET ALL TEAMS (owned by user)

@router.get("/")
def get_teams(user=Depends(require_user)):
    """
    Returns all teams belonging to the authenticated user.
    Ordered by newest first.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, name, description, image_url, color
        FROM teams
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user["id"],)
    )

    return {"teams": cur.fetchall()}


# GET SINGLE TEAM

@router.get("/{team_id}")
def get_team(team_id: int, user=Depends(require_user)):
    """
    Retrieves a single team if it belongs to the user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, name, description, image_url, color
        FROM teams
        WHERE id = %s AND user_id = %s
        """,
        (team_id, user["id"])
    )

    row = cur.fetchone()
    if not row:
        return {"error": "Team not found"}, 404

    return {"team": dict(row)}


# DELETE TEAM (also deletes image from Firebase)

@router.delete("/{team_id}")
def delete_team(team_id: int, user=Depends(require_user)):
    """
    Deletes a team owned by the authenticated user.
    Also removes associated Firebase image if present.
    """

    db = get_db()
    cur = db.cursor()

    # Get image_path first
    cur.execute(
        "SELECT image_path FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )
    existing = cur.fetchone()

    if existing and existing.get("image_path"):
        delete_photo_from_firebase(existing["image_path"])

    cur.execute(
        "DELETE FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )

    db.commit()

    return {"message": "Team deleted"}


# UPDATE TEAM DETAILS (supports optional image replacement + removal)

@router.put("/{team_id}")
async def update_team(
    team_id: int,
    name: str = Form(...),
    description: str = Form(None),
    color: str = Form("#9DBA8A"),  # NEW
    remove_image: str = Form(None),
    image: UploadFile = File(None),
    user=Depends(require_user)
):
    """
    Updates team name, description, color and optionally team image.
    Only allowed if user owns the team.
    Supports:
    - Image replacement
    - Image removal
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        "SELECT image_path FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )
    existing = cur.fetchone()

    if not existing:
        raise HTTPException(status_code=404, detail="Team not found")

    existing_image_path = existing.get("image_path")

    # =====================================================
    # ================= IMAGE REMOVAL LOGIC ===============
    # =====================================================

    if remove_image == "true":

        if existing_image_path:
            delete_photo_from_firebase(existing_image_path)

        cur.execute(
            """
            UPDATE teams
            SET name = %s,
                description = %s,
                color = %s,
                image_url = NULL,
                image_path = NULL
            WHERE id = %s AND user_id = %s
            RETURNING id, name, description, image_url, color
            """,
            (name, description, color, team_id, user["id"])
        )

    # =====================================================
    # ================= IMAGE REPLACEMENT =================
    # =====================================================

    elif image:

        if existing_image_path:
            delete_photo_from_firebase(existing_image_path)

        image_path, image_url = upload_photo_to_firebase(image, user["id"])

        cur.execute(
            """
            UPDATE teams
            SET name = %s,
                description = %s,
                color = %s,
                image_url = %s,
                image_path = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, name, description, image_url, color
            """,
            (name, description, color, image_url, image_path, team_id, user["id"])
        )

    # =====================================================
    # ================= TEXT ONLY UPDATE ==================
    # =====================================================

    else:
        cur.execute(
            """
            UPDATE teams
            SET name = %s,
                description = %s,
                color = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, name, description, image_url, color
            """,
            (name, description, color, team_id, user["id"])
        )

    row = cur.fetchone()
    db.commit()

    return {"team": dict(row)}

# =====================================================
# ================= MATCH (GAME) ENDPOINTS ============
# =====================================================

# CREATE MATCH

@router.post("/{team_id}/matches")
def create_match(
    team_id: int,
    data: MatchCreateSchema,
    user=Depends(require_user)
):
    """
    Creates a new match (game) inside a team.

    Validations:
    - Team must belong to user
    - No duplicate game dates for same team
    """

    db = get_db()
    cur = db.cursor()

    # Verify team ownership
    cur.execute(
        "SELECT id FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Team not found or unauthorized")

    # Check duplicate date
    cur.execute(
        """
        SELECT id
        FROM matches
        WHERE team_id = %s
          AND game_date = %s
        """,
        (team_id, data.game_date)
    )
    if cur.fetchone():
        raise HTTPException(
            status_code=409,
            detail="A game already exists for this date."
        )

    cur.execute(
        """
        INSERT INTO matches (
            team_id,
            name,
            opponent,
            game_date,
            team_score,
            opponent_score,
            description
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            team_id,
            data.name,
            data.opponent,
            data.game_date,
            data.team_score,
            data.opponent_score,
            data.description
        )
    )

    row = cur.fetchone()
    db.commit()

    return {"match": dict(row)}


# GET MATCHES FOR TEAM

@router.get("/{team_id}/matches")
def get_matches(team_id: int, user=Depends(require_user)):
    """
    Returns all matches for a team owned by the user.
    Ordered by most recent game first.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT m.*
        FROM matches m
        JOIN teams t ON m.team_id = t.id
        WHERE t.id = %s AND t.user_id = %s
        ORDER BY m.game_date DESC
        """,
        (team_id, user["id"])
    )

    return {"matches": cur.fetchall()}


# GET SINGLE MATCH

@router.get("/matches/{match_id}")
def get_match(match_id: int, user=Depends(require_user)):
    """
    Retrieves a specific match if it belongs to a team
    owned by the authenticated user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT m.*
        FROM matches m
        JOIN teams t ON m.team_id = t.id
        WHERE m.id = %s AND t.user_id = %s
        """,
        (match_id, user["id"])
    )

    row = cur.fetchone()
    if not row:
        return {"error": "Match not found"}, 404

    return {"match": dict(row)}


# DELETE MATCH

@router.delete("/matches/{match_id}")
def delete_match(match_id: int, user=Depends(require_user)):
    """
    Deletes a match only if it belongs to a team owned by the user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        DELETE FROM matches
        USING teams
        WHERE matches.team_id = teams.id
          AND matches.id = %s
          AND teams.user_id = %s
        """,
        (match_id, user["id"])
    )

    db.commit()
    return {"message": "Match deleted"}


# UPDATE MATCH DETAILS

@router.put("/matches/{match_id}")
def update_match(
    match_id: int,
    data: MatchCreateSchema,
    user=Depends(require_user)
):
    """
    Updates match metadata (name, opponent, scores, date, description).
    Ensures match belongs to a team owned by user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        UPDATE matches
        SET name = %s,
            opponent = %s,
            game_date = %s,
            team_score = %s,
            opponent_score = %s,
            description = %s
        FROM teams
        WHERE matches.team_id = teams.id
          AND matches.id = %s
          AND teams.user_id = %s
        RETURNING matches.*
        """,
        (
            data.name,
            data.opponent,
            data.game_date,
            data.team_score,
            data.opponent_score,
            data.description,
            match_id,
            user["id"]
        )
    )

    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")

    db.commit()
    return {"match": dict(row)}