"""
indv_player.py

Handles all individual player management routes for CoachAssist.

Features:
- Get all players for a team (with optional unit filter)
- Add a player
- Delete a player
- Get a single player
- Update player information

All routes are protected and require authentication.
Users may only access players belonging to their own teams.
"""


from fastapi import APIRouter, Depends, HTTPException, status, Response
from typing import List, Optional, Literal
from io import BytesIO
from datetime import datetime
from fpdf import FPDF

from backend.schemas.indv_player_schema import (
    PlayerCreate,
    PlayerOut,
    PlayerUpdate
)
from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_team_role

router = APIRouter(
    prefix="/teams",
    tags=["Players"]
)

UnitType = Literal["offense", "defense", "special"]


def verify_team_access(team_id: int, user_id: int, db, required_role: str = "viewer"):
    require_team_role(team_id, user_id, db, required_role)


# =========================
# GET ALL PLAYERS
# =========================
@router.get("/{team_id}/players", response_model=List[PlayerOut])
def get_players(
    team_id: int,
    unit: Optional[UnitType] = None,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    verify_team_access(team_id, user_id, db, "viewer")

    cur = db.cursor()

    query = """
        SELECT id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
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


# =========================
# EXPORT PDF
# =========================
@router.get("/{team_id}/players/export/pdf")
def export_players_pdf(
    team_id: int,
    unit: Optional[UnitType] = None,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    verify_team_access(team_id, user_id, db, "viewer")

    cur = db.cursor()

    query = """
        SELECT id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
        FROM indv_players
        WHERE team_id = %s
    """
    params = [team_id]

    if unit:
        query += " AND unit = %s"
        params.append(unit)

    query += " ORDER BY jersey_number ASC, player_name ASC"

    cur.execute(query, tuple(params))
    players = cur.fetchall()
    cur.close()

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"Team {team_id} Player Table", ln=True)

    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(20, 8, "#", border=1)
    pdf.cell(80, 8, "Name", border=1)
    pdf.cell(35, 8, "Unit", border=1)
    pdf.cell(35, 8, "Position", border=1, ln=True)

    pdf.set_font("Helvetica", "", 10)

    for p in players:
        pdf.cell(20, 8, str(p["jersey_number"]), border=1)
        pdf.cell(80, 8, p["player_name"], border=1)
        pdf.cell(35, 8, p["unit"], border=1)
        pdf.cell(35, 8, p["position"], border=1, ln=True)

    pdf_bytes = pdf.output(dest="S")
    if isinstance(pdf_bytes, str):
        pdf_bytes = pdf_bytes.encode("latin-1")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="team_{team_id}_players.pdf"'
        }
    )


# =========================
# ADD PLAYER
# =========================
@router.post("/{team_id}/players", response_model=PlayerOut, status_code=201)
def add_player(
    team_id: int,
    player: PlayerCreate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    verify_team_access(team_id, user_id, db, "editor")

    if team_id != player.team_id:
        raise HTTPException(status_code=400, detail="Team ID mismatch")

    cur = db.cursor()

    try:
        # Find existing athlete
        cur.execute(
            """
            SELECT athlete_id FROM indv_players
            WHERE team_id = %s AND player_name = %s AND jersey_number = %s
            LIMIT 1
            """,
            (player.team_id, player.player_name, player.jersey_number)
        )
        existing = cur.fetchone()

        athlete_id = existing["athlete_id"] if existing else None

        # Prevent duplicate position
        if athlete_id:
            cur.execute(
                """
                SELECT id FROM indv_players
                WHERE athlete_id = %s AND position = %s
                """,
                (athlete_id, player.position)
            )
            if cur.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Player already exists at this position"
                )

        # Insert player
        cur.execute(
            """
            INSERT INTO indv_players
            (athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
            """,
            (
                athlete_id,
                player.team_id,
                player.player_name,
                player.jersey_number,
                player.unit,
                player.position,
                player.is_priority
            )
        )

        new_player = cur.fetchone()

        # Assign athlete_id if new
        if new_player["athlete_id"] is None:
            cur.execute(
                "UPDATE indv_players SET athlete_id = %s WHERE id = %s",
                (new_player["id"], new_player["id"])
            )
            new_player["athlete_id"] = new_player["id"]

        db.commit()
        return new_player

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Failed to add player")

    finally:
        cur.close()


# =========================
# SWITCH POSITION
# =========================
@router.post("/players/{player_id}/switch-position", response_model=PlayerOut)
def switch_position(
    player_id: int,
    payload: dict,
    db=Depends(get_db),
    user=Depends(require_user)
):
    new_position = payload.get("new_position")

    if not new_position:
        raise HTTPException(status_code=400, detail="New position required")

    cur = db.cursor()

    # 🔥 Get current player
    cur.execute("SELECT * FROM indv_players WHERE id = %s", (player_id,))
    player = cur.fetchone()

    if not player:
        cur.close()
        raise HTTPException(status_code=404, detail="Player not found")

    require_team_role(player["team_id"], user["id"], db, "editor")

    #  STEP 1: deactivate current player
    cur.execute(
        "UPDATE indv_players SET is_active = FALSE WHERE id = %s",
        (player_id,)
    )

    #  STEP 2: check if position already exists
    cur.execute(
        """
        SELECT id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
        FROM indv_players
        WHERE athlete_id = %s AND position = %s
        """,
        (player["athlete_id"], new_position)
    )
    existing = cur.fetchone()

    if existing:
        #  STEP 3: reactivate existing position
        cur.execute(
            "UPDATE indv_players SET is_active = TRUE WHERE id = %s",
            (existing["id"],)
        )

        #  re-fetch updated row
        cur.execute(
            """
            SELECT id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
            FROM indv_players
            WHERE id = %s
            """,
            (existing["id"],)
        )
        updated_existing = cur.fetchone()

        db.commit()
        cur.close()

        return updated_existing

    #  STEP 4: ALWAYS fetch latest canonical player data
    cur.execute(
        """
        SELECT player_name, jersey_number, team_id, athlete_id, is_priority
        FROM indv_players
        WHERE athlete_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        (player["athlete_id"],)
    )
    latest_player = cur.fetchone()

    if not latest_player:
        latest_player = player  # fallback safety

    #  STEP 5: create new active row with correct data
    cur.execute(
        """
        INSERT INTO indv_players
        (athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
        RETURNING id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
        """,
        (
            latest_player["athlete_id"],
            latest_player["team_id"],
            latest_player["player_name"],
            latest_player["jersey_number"],
            player["unit"],  # can later derive from position if desired
            new_position,
            latest_player["is_priority"]
        )
    )

    new_player = cur.fetchone()

    db.commit()
    cur.close()

    return new_player


# =========================
# DELETE PLAYER
# =========================
@router.delete("/players/{player_id}", status_code=200)
def delete_player(
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    cur = db.cursor()

    cur.execute("SELECT id, team_id FROM indv_players WHERE id = %s", (player_id,))
    player = cur.fetchone()

    if not player:
        cur.close()
        raise HTTPException(status_code=404, detail="Player not found")

    require_team_role(player["team_id"], user_id, db, "editor")

    cur.execute("DELETE FROM indv_players WHERE id = %s", (player_id,))
    db.commit()
    cur.close()

    return {"success": True}


# =========================
# GET SINGLE PLAYER
# =========================
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
        SELECT id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
        FROM indv_players
        WHERE id = %s
        """,
        (player_id,)
    )

    player = cur.fetchone()
    cur.close()

    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    require_team_role(player["team_id"], user_id, db, "viewer")

    return player


# =========================
# UPDATE PLAYER (NO POSITION CHANGE)
# =========================
@router.put("/players/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int,
    updates: PlayerUpdate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    cur = db.cursor()

    cur.execute("SELECT id, team_id, athlete_id FROM indv_players WHERE id = %s", (player_id,))
    player = cur.fetchone()

    if not player:
        cur.close()
        raise HTTPException(status_code=404, detail="Player not found")

    require_team_role(player["team_id"], user_id, db, "editor")

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

    #  Position updates blocked
    if updates.is_priority is not None:
        fields.append("is_priority = %s")
        values.append(updates.is_priority)

    if not fields:
        cur.close()
        raise HTTPException(status_code=400, detail="No fields provided")

    values.append(player["athlete_id"])

    try:
        cur.execute(
            f"""
            UPDATE indv_players
            SET {", ".join(fields)}
            WHERE athlete_id = %s
            RETURNING id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
            """,
            tuple(values)
        )

        updated_players = cur.fetchall()

        # return the active one
        updated_player = next(
            (p for p in updated_players if p["is_active"]),
            updated_players[0]
        )
        db.commit()
        return updated_player

    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Update failed")

    finally:
        cur.close()