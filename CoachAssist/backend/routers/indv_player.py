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
    match_id: Optional[int] = None,
    db=Depends(get_db),
    user=Depends(require_user)
):
    user_id = user["id"]
    verify_team_access(team_id, user_id, db, "viewer")

    cur = db.cursor()

    query = """
        SELECT id, athlete_id, team_id, player_name, jersey_number, unit, position, is_priority, is_active
        FROM indv_players
        WHERE team_id = %s AND is_active = TRUE
    """
    params = [team_id]

    if unit:
        query += " AND unit = %s"
        params.append(unit)

    query += " ORDER BY jersey_number ASC, player_name ASC"

    cur.execute(query, tuple(params))
    players = cur.fetchall()

    player_ids = [p["id"] for p in players]
    stats_by_player = {}
    notes_by_player = {}

    if match_id and player_ids:
        placeholders = ", ".join(["%s"] * len(player_ids))

        cur.execute(f"""
            SELECT *
            FROM player_stats
            WHERE game_id = %s AND player_id IN ({placeholders})
        """, [match_id] + player_ids)

        stat_rows = cur.fetchall()
        excluded_stat_columns = {"id", "player_id", "game_id", "quarter", "created_at"}

        for row in stat_rows:
            player_id = row["player_id"]
            player_stats = stats_by_player.setdefault(player_id, {})

            for key, value in row.items():
                if key in excluded_stat_columns or value is None:
                    continue
                player_stats[key] = player_stats.get(key, 0) + value

        cur.execute(f"""
            SELECT player_id, note, time, quarter
            FROM player_notes
            WHERE game_id = %s AND player_id IN ({placeholders})
            ORDER BY created_at ASC
        """, [match_id] + player_ids)

        for row in cur.fetchall():
            note = row.get("note")
            if not note:
                continue
            notes_by_player.setdefault(row["player_id"], []).append(row)

    cur.close()

    unit_titles = {
        "offense": "Offensive Unit Report",
        "defense": "Defensive Unit Report",
        "special": "Special Teams Unit Report",
    }

    def clean_text(value):
        return str(value or "").encode("latin-1", "replace").decode("latin-1")

    def title_case_name(value):
        return clean_text(value).strip().title()

    preferred_metric_order = [
        "snaps_played",
        "penalties",
        "turnovers",
        "touchdowns",
        "pass_attempts",
        "pass_completions",
        "passing_yards",
        "passing_tds",
        "interceptions_thrown",
        "rush_attempts",
        "rushing_yards",
        "rushing_tds",
        "targets",
        "receptions",
        "receiving_yards",
        "receiving_tds",
        "drops",
        "lead_blocks",
        "pass_block_snaps",
        "run_block_snaps",
        "sacks_allowed",
        "bad_snaps",
        "tackles",
        "tackles_for_loss",
        "sacks",
        "forced_fumbles",
        "interceptions",
        "passes_defended",
        "targets_allowed",
        "completions_allowed",
        "field_goals_made",
        "field_goals_attempted",
        "extra_points_made",
        "punts",
        "punt_yards",
        "punts_inside_20",
        "kick_returns",
        "kick_return_yards",
        "kick_return_tds",
        "punt_returns",
        "punt_return_yards",
        "punt_return_tds",
        "total_snaps",
    ]

    stat_label_overrides = {
        "snaps_played": "Snaps Played",
        "penalties": "Penalties",
        "turnovers": "Turnovers",
        "touchdowns": "Touchdowns",
        "passing_tds": "Passing TDs",
        "rushing_tds": "Rushing TDs",
        "receiving_tds": "Receiving TDs",
        "kick_return_tds": "Kick Return TDs",
        "punt_return_tds": "Punt Return TDs",
    }

    def format_stat_label(value):
        if value in stat_label_overrides:
            return stat_label_overrides[value]
        return clean_text(value).replace("_", " ").title()

    def ordered_metric_keys(keys):
        order_lookup = {key: index for index, key in enumerate(preferred_metric_order)}
        return sorted(keys, key=lambda key: (order_lookup.get(key, len(order_lookup)), key))

    def has_recorded_metric_value(metric_key):
        return any(
            (player_stats.get(metric_key) or 0) != 0
            for player_stats in stats_by_player.values()
        )

    def wrap_text(pdf_obj, text, width):
        words = clean_text(text).split()
        if not words:
            return [""]

        max_width = width - 6
        lines = []
        current = ""

        for word in words:
            if pdf_obj.get_string_width(word) > max_width:
                if current:
                    lines.append(current)
                    current = ""

                chunk = ""
                for char in word:
                    candidate = f"{chunk}{char}"
                    if pdf_obj.get_string_width(candidate) <= max_width:
                        chunk = candidate
                    else:
                        lines.append(chunk)
                        chunk = char

                if chunk:
                    current = chunk
                continue

            candidate = f"{current} {word}".strip()
            if pdf_obj.get_string_width(candidate) <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word

        if current:
            lines.append(current)
        return lines

    def draw_wrapped_table(pdf_obj, columns, rows, font_size=8):
        line_height = 5
        vertical_padding = 3
        min_row_height = 11
        header_height = max(9, max(len(wrap_text(pdf_obj, column["label"], column["width"])) for column in columns) * 4 + 4)

        def draw_header():
            pdf_obj.set_font("Helvetica", "B", font_size)
            x = pdf_obj.get_x()
            y = pdf_obj.get_y()
            current_x = x

            for column in columns:
                pdf_obj.rect(current_x, y, column["width"], header_height)
                for line_index, line in enumerate(wrap_text(pdf_obj, column["label"], column["width"])):
                    pdf_obj.set_xy(current_x + 2, y + 2 + (line_index * 4))
                    pdf_obj.cell(column["width"] - 4, 4, line)
                current_x += column["width"]

            pdf_obj.set_xy(x, y + header_height)
            pdf_obj.set_font("Helvetica", "", font_size)

        draw_header()

        if not rows:
            pdf_obj.cell(sum(c["width"] for c in columns), min_row_height, "No data available.", border=1, ln=True)
            return

        for row in rows:
            wrapped_cells = [
                wrap_text(pdf_obj, row.get(column["key"], ""), column["width"])
                for column in columns
            ]
            row_height = max(
                min_row_height,
                max(len(lines) for lines in wrapped_cells) * line_height + vertical_padding * 2
            )

            if pdf_obj.get_y() + row_height > pdf_obj.page_break_trigger:
                pdf_obj.add_page(orientation="L")
                draw_header()

            x = pdf_obj.get_x()
            y = pdf_obj.get_y()
            current_x = x

            for column in columns:
                pdf_obj.rect(current_x, y, column["width"], row_height)
                current_x += column["width"]

            current_x = x
            for column, lines in zip(columns, wrapped_cells):
                for line_index, line in enumerate(lines):
                    pdf_obj.set_xy(current_x + 3, y + vertical_padding + (line_index * line_height))
                    pdf_obj.cell(column["width"] - 6, line_height, line)
                current_x += column["width"]

            pdf_obj.set_xy(x, y + row_height)

    pdf = FPDF(orientation="L")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page(orientation="L")

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, unit_titles.get(unit, "Unit Report"), ln=True)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Player Metrics", ln=True)

    metric_keys = ordered_metric_keys({
        key
        for player_stats in stats_by_player.values()
        for key in player_stats.keys()
        if has_recorded_metric_value(key)
    })
    metric_rows = []
    insight_rows = []

    for player in players:
        player_stats = stats_by_player.get(player["id"], {})
        metric_row = {
            "jersey": clean_text(player["jersey_number"]),
            "name": title_case_name(player["player_name"]),
            "position": clean_text(player["position"]).upper(),
        }

        for metric_key in metric_keys:
            metric_value = player_stats.get(metric_key)
            metric_row[metric_key] = clean_text(metric_value if metric_value is not None else 0)

        metric_rows.append(metric_row)

        for note in notes_by_player.get(player["id"], []):
            insight_rows.append({
                "player": title_case_name(player["player_name"]),
                "jersey": clean_text(player["jersey_number"]),
                "position": clean_text(player["position"]).upper(),
                "observation": note.get("note") or "",
            })

    base_columns = [
        {"key": "jersey", "label": "#", "width": 14},
        {"key": "name", "label": "Name", "width": 48},
        {"key": "position", "label": "Position", "width": 26},
    ]
    available_metric_width = 273 - sum(column["width"] for column in base_columns)

    if metric_keys:
        max_metrics_per_table = 8
        metric_chunks = [
            metric_keys[index:index + max_metrics_per_table]
            for index in range(0, len(metric_keys), max_metrics_per_table)
        ]

        for chunk_index, metric_chunk in enumerate(metric_chunks):
            if chunk_index > 0:
                pdf.ln(6)
                pdf.set_font("Helvetica", "B", 10)
                pdf.cell(0, 7, f"Additional Metrics ({chunk_index + 1})", ln=True)

            metric_width = available_metric_width / len(metric_chunk)
            metric_columns = [
                {"key": metric_key, "label": format_stat_label(metric_key), "width": metric_width}
                for metric_key in metric_chunk
            ]

            draw_wrapped_table(
                pdf,
                base_columns + metric_columns,
                metric_rows,
                font_size=8 if len(metric_columns) <= 6 else 7,
            )
    else:
        draw_wrapped_table(
            pdf,
            base_columns + [{"key": "metrics", "label": "Metrics", "width": available_metric_width}],
            [{**row, "metrics": "No metrics recorded"} for row in metric_rows],
            font_size=8,
        )

    pdf.ln(8)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Player Insights / Observations", ln=True)

    if insight_rows:
        draw_wrapped_table(
            pdf,
            [
                {"key": "player", "label": "Player", "width": 55},
                {"key": "jersey", "label": "Jersey #", "width": 25},
                {"key": "position", "label": "Position", "width": 30},
                {"key": "observation", "label": "Observation / Insight", "width": 163},
            ],
            insight_rows,
            font_size=8,
        )
    else:
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(0, 8, "No player insights available for this unit.", ln=True)

    pdf_bytes = pdf.output(dest="S")
    if isinstance(pdf_bytes, str):
        pdf_bytes = pdf_bytes.encode("latin-1")
    else:
        pdf_bytes = bytes(pdf_bytes)

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

    #  Get current player
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
