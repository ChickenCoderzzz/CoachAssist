"""
teams.py

Handles:
- Team (Folder) management
- Match (Game) management

Features:
- Create, read, update, delete teams
- Create, read, update, delete matches
- Ownership verification for all operations

All routes require authentication.
Users can only access teams and matches they own.
"""

from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.schemas.team_folder_schema import TeamCreateSchema
from backend.schemas.match_schema import MatchCreateSchema
from backend.routers.auth import require_user

#Endpoints prefixed with /teams
router = APIRouter(
    prefix="/teams",
    tags=["Teams"]
)

#=== TEAM FOLDER ENDPOINTS ===

#CREATE A TEAM

@router.post("/")
def create_team(data: TeamCreateSchema, user=Depends(require_user)):
    """
    Creates a new team folder for the authenticated user.

    Each team is owned by a specific user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        INSERT INTO teams (user_id, name, description, image_url)
        VALUES (%s, %s, %s, %s)
        RETURNING id, name, description, image_url
        """,
        (user["id"], data.name, data.description, data.image_url)
    )

    row = cur.fetchone()
    db.commit()

    return {"team": dict(row)}

#GET ALL TEAMS (owned by user)

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
        SELECT id, name, description, image_url
        FROM teams
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user["id"],)
    )

    return {"teams": cur.fetchall()}

#GET SINGLE TEAM

@router.get("/{team_id}")
def get_team(team_id: int, user=Depends(require_user)):
    """
    Retrieves a single team if it belongs to the user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, name, description, image_url
        FROM teams
        WHERE id = %s AND user_id = %s
        """,
        (team_id, user["id"])
    )

    row = cur.fetchone()
    if not row:
        return {"error": "Team not found"}, 404

    return {"team": dict(row)}


#DELETE TEAM

@router.delete("/{team_id}")
def delete_team(team_id: int, user=Depends(require_user)):
    """
    Deletes a team owned by the authenticated user.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        "DELETE FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )
    db.commit()

    return {"message": "Team deleted"}

#UPDATE TEAM DETAILS

@router.put("/{team_id}")
def update_team(
    team_id: int,
    data: TeamCreateSchema,
    user=Depends(require_user)
):
    """
    Updates team name and description.
    Only allowed if user owns the team.
    """

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        UPDATE teams
        SET name = %s,
            description = %s
        WHERE id = %s AND user_id = %s
        RETURNING id, name, description, image_url
        """,
        (data.name, data.description, team_id, user["id"])
    )

    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Team not found")

    db.commit()
    return {"team": dict(row)}


#=== MATCH (GAME) ENDPOINTS ===

#CREATE MATCH

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

    #Verify team ownership
    cur.execute(
        "SELECT id FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Team not found or unauthorized")

    #Check for duplicate dates when making games
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

#GET MATCHES FOR TEAM

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

