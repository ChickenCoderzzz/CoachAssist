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

