from fastapi import APIRouter, Depends
from backend.database import get_db
from fastapi import APIRouter, Depends
from backend.schemas.team_folder_schema import TeamCreateSchema
from backend.routers.auth import require_user

router = APIRouter(
    prefix="/teams",
    tags=["Teams"]
)

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

    team = cur.fetchone()
    db.commit()

    return {"team": team}

@router.get("/")
def get_teams(user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
       "SELECT id, name, description, image_url FROM teams WHERE user_id = %s",
       (user["id"],) 
    )

    teams = cur.fetchall()
    return {"teams": teams}

@router.get("/search")
def search_teams(query: str, user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT id, name, description, image_url
        FROM teams
        WHERE user_id = %s
        AND name ILIKE %s
        """,
        (user["id"], f"{query}%")
    )

    teams = cur.fetchall()
    return {"teams": teams}

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

    team = cur.fetchone()

    if not team:
        return{"error": "Team not found"}, 404
    
    return {"team": team}

@router.get("/{team_id}/games")
def get_team_games(team_id: int, user=Depends(require_user)):
    db = get_db()
    cur = db.cursor()

    # ownership check via team
    cur.execute(
        "SELECT id FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )

    if not cur.fetchone():
        return {"error": "Unauthorized"}, 403

    cur.execute(
        """
        SELECT id, title, video_url, created_at
        FROM games
        WHERE team_id = %s
        ORDER BY created_at DESC
        """,
        (team_id,)
    )

    games = cur.fetchall()
    return {"games": games}

@router.delete("/{team_id}")
@router.delete("/{team_id}/")
def delete_team(team_id: int, user=Depends (require_user)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        "SELECT id FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user["id"])
    )

    if not cur.fetchone():
        return {"error": "Team not found or unauthrorized"}, 404
    
    #Delete team (games cascade automatically)
    cur.execute(
        "DELETE FROM teams WHERE id = %s",
        (team_id,)
    )

    db.commit()

    return {"message": "Team deleted"}
