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

#Router for team-related player endpoints
router = APIRouter(
    prefix="/teams",
    tags=["Players"]
)

#Restricts allowed unit values to valid football categories
UnitType = Literal["offense", "defense", "special"]


#HELPER: ensure logged-in user owns the team

def verify_team_access(team_id: int, user_id: int, db):
    """
    Ensures that the authenticated user owns the team
    they are attempting to access.

    Prevents horizontal privilege escalation.
    """

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

# GET ALL PLAYERS FOR A TEAM (optional unit filter)

@router.get("/{team_id}/players", response_model=List[PlayerOut])
def get_players(
    team_id: int,
    unit: Optional[UnitType] = None,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Returns all players belonging to a team.

    Optional:
    - Filter by unit (offense, defense, special teams)

    Only accessible by the team owner.
    """

    user_id = user["id"]

    #Ensures user owns the team
    verify_team_access(team_id, user_id, db)

    cur = db.cursor()

    #Base query
    query = """
        SELECT id, team_id, player_name, jersey_number, unit, position
        FROM indv_players
        WHERE team_id = %s
    """
    params = [team_id]

    #Optional filtering by unit
    if unit:
        query += " AND unit = %s"
        params.append(unit)

    cur.execute(query, tuple(params))
    players = cur.fetchall()
    cur.close()

    return players


@router.get("/{team_id}/players/export/pdf")
def export_players_pdf(
    team_id: int,
    unit: Optional[UnitType] = None,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Export team players (optionally filtered by unit) as a simple PDF table.
    """

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

    query += " ORDER BY jersey_number ASC, player_name ASC"
    cur.execute(query, tuple(params))
    players = cur.fetchall()
    cur.close()

    unit_label = unit.capitalize() if unit else "All"
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, f"Team {team_id} Player Table ({unit_label})", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 8, f"Generated: {timestamp}", ln=True)
    pdf.ln(2)

    # Header
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(20, 8, "#", border=1, align="C")
    pdf.cell(80, 8, "Name", border=1)
    pdf.cell(35, 8, "Unit", border=1)
    pdf.cell(35, 8, "Position", border=1, ln=True)

    # Rows
    pdf.set_font("Helvetica", "", 10)
    if not players:
        pdf.cell(170, 8, "No players found for this selection.", border=1, ln=True)
    else:
        for p in players:
            jersey = str(p.get("jersey_number", ""))
            name = str(p.get("player_name", ""))[:38]
            row_unit = str(p.get("unit", ""))
            position = str(p.get("position", ""))

            pdf.cell(20, 8, jersey, border=1, align="C")
            pdf.cell(80, 8, name, border=1)
            pdf.cell(35, 8, row_unit, border=1)
            pdf.cell(35, 8, position, border=1, ln=True)

    pdf_bytes = pdf.output(dest="S")
    if isinstance(pdf_bytes, str):
        pdf_bytes = pdf_bytes.encode("latin-1")
    buffer = BytesIO(pdf_bytes)

    filename_unit = unit if unit else "all"
    filename = f"team_{team_id}_{filename_unit}_players.pdf"

    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

#ADD A PLAYER

@router.post("/{team_id}/players", response_model=PlayerOut, status_code=201)
def add_player(
    team_id: int,
    player: PlayerCreate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Creates a new player for a team.

    Validates:
    - User owns the team
    - Team ID in URL matches request body
    - Jersey number conflicts handled at DB level
    """

    user_id = user["id"]
    verify_team_access(team_id, user_id, db)

    #Ensure URL team_id matches body team_id
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

    #Roll back transaction on conflict
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Player already exists or invalid data"
        )

    finally:
        cur.close()

#DELETE A PLAYER

@router.delete("/players/{player_id}", status_code=200)
def delete_player(
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Creates a new player for a team.

    Validates:
    - User owns the team
    - Team ID in URL matches request body
    - Jersey number conflicts handled at DB level
    """

    user_id = user["id"]
    cur = db.cursor()

    # Ensure player belongs to team owned by user
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

    #Delete player
    cur.execute(
        "DELETE FROM indv_players WHERE id = %s",
        (player_id,)
    )
    db.commit()
    cur.close()

    return {"success": True}

# GET A SINGLE PLAYER

@router.get("/players/{player_id}", response_model=PlayerOut)
def get_player(
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Returns detailed information for a single player.

    Access restricted to team owner.
    """

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

#UPDATE PLAYER DETAILS

@router.put("/players/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int,
    updates: PlayerUpdate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Updates one or more player fields dynamically.

    Only updates fields that are provided.
    Prevents unauthorized access via team ownership validation.
    """
    
    user_id = user["id"]
    cur = db.cursor()

    #Ensure player belongs to team owned by user
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

    #Build dynamic update query based on provided fields
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
