from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Literal

from backend.schemas.indv_player_schema import (
    PlayerCreate,
    PlayerOut,
    PlayerUpdate
)
from backend.database import get_db
from backend.routers.auth import require_user


router = APIRouter(
    prefix="/teams",
    tags=["Players"]
)

UnitType = Literal["offense", "defense", "special"]


# --------------------------------------------------
# Helper: ensure logged-in user owns the team
# --------------------------------------------------
def verify_team_access(team_id: int, user_id: int, db):
    cur = db.cursor()
    cur.execute(
        """
        SELECT id
        FROM teams
        WHERE id = %s AND user_id = %s
        """,
        (team_id, user_id)
    )
    team = cur.fetchone()
    cur.close()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this team"
        )


# --------------------------------------------------
# Get all players for a team (optional unit filter)
# --------------------------------------------------
@router.get("/{team_id}/players", response_model=List[PlayerOut])
def get_players(
    team_id: int,
    unit: Optional[UnitType] = None,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    verify_team_access(team_id, user_id, db)

    cur = db.cursor()

    query = """
        SELECT id, team_id, player_name, jersey_number, unit, position
        FROM indv_players
        WHERE team_id = %s
    """
    params = [team_id]

    if unit:
        query += " AND unit = %s"
        params.append(unit)

    cur.execute(query, tuple(params))
    players = cur.fetchall()
    cur.close()

    return players


# --------------------------------------------------
# Add a player
# --------------------------------------------------
@router.post("/{team_id}/players", response_model=PlayerOut, status_code=201)
def add_player(
    team_id: int,
    player: PlayerCreate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    verify_team_access(team_id, user_id, db)

    if team_id != player.team_id:
        raise HTTPException(
            status_code=400,
            detail="Team ID mismatch"
        )

    cur = db.cursor()
    try:
        cur.execute(
            """
            INSERT INTO indv_players
            (team_id, player_name, jersey_number, unit, position)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, team_id, player_name, jersey_number, unit, position
            """,
            (
                player.team_id,
                player.player_name,
                player.jersey_number,
                player.unit,
                player.position
            )
        )
        new_player = cur.fetchone()
        db.commit()
        return new_player

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Player already exists or invalid data"
        )

    finally:
        cur.close()


# --------------------------------------------------
# Delete a player
# --------------------------------------------------
@router.delete("/players/{player_id}", status_code=200)
def delete_player(
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    cur = db.cursor()

    cur.execute(
        """
        SELECT p.id
        FROM indv_players p
        JOIN teams t ON p.team_id = t.id
        WHERE p.id = %s AND t.user_id = %s
        """,
        (player_id, user_id)
    )
    player = cur.fetchone()

    if not player:
        cur.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found or access denied"
        )

    cur.execute(
        "DELETE FROM indv_players WHERE id = %s",
        (player_id,)
    )
    db.commit()
    cur.close()

    return {"success": True}


# --------------------------------------------------
# Get a single player
# --------------------------------------------------
@router.get("/players/{player_id}", response_model=PlayerOut)
def get_player(
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    cur = db.cursor()

    cur.execute(
        """
        SELECT
            p.id,
            p.team_id,
            p.player_name,
            p.jersey_number,
            p.unit,
            p.position
        FROM indv_players p
        JOIN teams t ON p.team_id = t.id
        WHERE p.id = %s AND t.user_id = %s
        """,
        (player_id, user_id)
    )

    player = cur.fetchone()
    cur.close()

    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found or access denied"
        )

    return player


# --------------------------------------------------
# Update a player
# --------------------------------------------------
@router.put("/players/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int,
    updates: PlayerUpdate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    cur = db.cursor()

    cur.execute(
        """
        SELECT p.id
        FROM indv_players p
        JOIN teams t ON p.team_id = t.id
        WHERE p.id = %s AND t.user_id = %s
        """,
        (player_id, user_id)
    )
    player = cur.fetchone()

    if not player:
        cur.close()
        raise HTTPException(
            status_code=404,
            detail="Player not found or access denied"
        )

    fields = []
    values = []

    if updates.player_name is not None:
        fields.append("player_name = %s")
        values.append(updates.player_name)

    if updates.jersey_number is not None:
        fields.append("jersey_number = %s")
        values.append(updates.jersey_number)

    if updates.unit is not None:
        fields.append("unit = %s")
        values.append(updates.unit)

    if updates.position is not None:
        fields.append("position = %s")
        values.append(updates.position)

    if not fields:
        cur.close()
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    values.append(player_id)

    try:
        cur.execute(
            f"""
            UPDATE indv_players
            SET {", ".join(fields)}
            WHERE id = %s
            RETURNING id, team_id, player_name, jersey_number, unit, position
            """,
            tuple(values)
        )
        updated_player = cur.fetchone()
        db.commit()
        return updated_player

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Update failed (possible jersey number conflict)"
        )

    finally:
        cur.close()
