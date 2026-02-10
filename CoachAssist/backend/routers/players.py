from fastapi import APIRouter, Depends, status
from psycopg2.extras import RealDictCursor
from backend.database import get_db
from backend.routers.auth import require_username
from backend.schemas.auth_schema import PlayerCreateSchema

router = APIRouter(prefix="/players", tags=["players"])

# Create a player
@router.post("", status_code=status.HTTP_201_CREATED)
def create_player(
    data: PlayerCreateSchema,
    username: str = Depends(require_username),
    db=Depends(get_db),
):
    with db.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO players
            (coach_username, player_name, jersey_number, position, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                username,
                data.player_name,
                data.jersey_number,
                data.position,
                data.notes,
            ),
        )
        player = cur.fetchone()
        db.commit()

    return dict(player)


# Get all players for logged-in coach
@router.get("")
def get_players(
    username: str = Depends(require_username),
    db=Depends(get_db),
):
    with db.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM players WHERE coach_username=%s", (username,))
        players = cur.fetchall()

    return [dict(p) for p in players]
