from fastapi import APIRouter, Depends, HTTPException, Response, status
from psycopg2.extras import RealDictCursor
from backend.database import get_db
from backend.routers.auth import require_username
from backend.schemas.auth_schema import PlayerCreateSchema
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/players", tags=["players"])


class PlayerUpdateStatsSchema(BaseModel):
    touchdowns: Optional[int] = 0
    yards: Optional[int] = 0
    tackles: Optional[int] = 0
    interceptions: Optional[int] = 0


@router.post("")
def create_player(data: PlayerCreateSchema, username=Depends(require_username)):
    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        INSERT INTO players
        (coach_username, player_name, jersey_number, unit, position, notes)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (username, data.player_name, data.jersey_number, data.unit, data.position, data.notes),
    )

    player = cur.fetchone()
    db.commit()
    cur.close()
    db.close()
    return dict(player)


@router.get("")
def get_players(username: str = Depends(require_username), db=Depends(get_db)):
    with db.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM players WHERE coach_username=%s ORDER BY created_at DESC", (username,))
        players = cur.fetchall()
    return [dict(p) for p in players]


@router.put("/{player_id}")
def update_player_stats(
    player_id: int,
    data: PlayerUpdateStatsSchema,
    username: str = Depends(require_username),
    db=Depends(get_db),
):
    with db.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE players
            SET touchdowns=%s,
                yards=%s,
                tackles=%s,
                interceptions=%s
            WHERE id=%s AND coach_username=%s
            RETURNING *;
            """,
            (
                data.touchdowns,
                data.yards,
                data.tackles,
                data.interceptions,
                player_id,
                username,
            ),
        )

        updated = cur.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Player not found")

        db.commit()

    return dict(updated)


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(player_id: int, username: str = Depends(require_username), db=Depends(get_db)):
    with db.cursor() as cur:
        cur.execute(
            "DELETE FROM players WHERE id=%s AND coach_username=%s",
            (player_id, username),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Player not found")
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
