from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.schemas.team_folder_schema import TeamCreateSchema
from backend.schemas.match_schema import MatchCreateSchema
from backend.routers.auth import require_user

router = APIRouter(
    prefix="/teams",
    tags=["Teams"]
)

#Endpoints for Teams

#Create Team
@router.post("/")
def create_team(data: TeamCreateSchema, user=Depends(require_user)):
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

#Get All Teams
@router.get("/")
def get_teams(user=Depends(require_user)):
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

# Get Single Team
@router.get("/{team_id}")
def get_team(team_id: int, user=Depends(require_user)):
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


#Delete Team
@router.delete("/{team_id}")
def delete_team(team_id: int, user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        "DELETE FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )
    db.commit()

    return {"message": "Team deleted"}

#Update Team
@router.put("/{team_id}")
def update_team(
    team_id: int,
    data: TeamCreateSchema,
    user=Depends(require_user)
):
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


#Match (Game) endpoints

# Create Match
@router.post("/{team_id}/matches")
def create_match(
    team_id: int,
    data: MatchCreateSchema,
    user=Depends(require_user)
):
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



#Get Matches for Team
@router.get("/{team_id}/matches")
def get_matches(team_id: int, user=Depends(require_user)):
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

# Get Single Match
@router.get("/matches/{match_id}")
def get_match(match_id: int, user=Depends(require_user)):
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

# Delete Match
@router.delete("/matches/{match_id}")
def delete_match(match_id: int, user=Depends(require_user)):
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

# Update Match
@router.put("/matches/{match_id}")
def update_match(
    match_id: int,
    data: MatchCreateSchema,
    user=Depends(require_user)
):
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

