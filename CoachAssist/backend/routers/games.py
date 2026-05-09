
from fastapi import APIRouter, HTTPException, Depends, Response, status
from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_game_role
from fpdf import FPDF
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

router = APIRouter(
    prefix="/games",
    tags=["Games"]
)

class GameStateRow(BaseModel):
    id: Optional[int]
    text: str
    time: str
    quarter: Optional[str] = None #Added by Wences Jacob Lorenzo

class GameStateUpdate(BaseModel):
    category: str
    data: List[GameStateRow]

class GameStateExportRow(BaseModel):
    observation: Optional[str] = ""
    text: Optional[str] = None
    time: Optional[str] = ""
    quarter: Optional[str] = None

class GameStateExportRequest(BaseModel):
    title: str = "Game State Report - General"
    metrics: Optional[Dict[str, Dict[str, Any]]] = None
    rows: List[GameStateExportRow]

def verify_game_access(game_id: int, user_id: int, db, required_role: str = "viewer"):
    require_game_role(game_id, user_id, db, required_role)


@router.get("/{game_id}/state")
def get_game_state(
    game_id: int, 
    db=Depends(get_db), 
    user=Depends(require_user)
):
    verify_game_access(game_id, user["id"], db)
    cur = db.cursor()
    
    cur.execute("""
        SELECT id, category, observation as text, time, quarter
        FROM game_states 
        WHERE game_id = %s
    """, (game_id,))
    
    rows = cur.fetchall()
    
    # Transform flat list into nested dictionary structure expected by frontend
    result = {
        "Game State": [],
        "Offensive": [],
        "Defensive": [],
        "Special": []
    }
    
    for row in rows:
        category = row["category"]
        if category in result:
            result[category].append({
                "id": row["id"],
                "text": row["text"],
                "time": row["time"],
                "quarter": row["quarter"] #Added by Wences Jacob Lorenzo
            })
            
    return result

@router.put("/{game_id}/state")
def update_game_state(
    game_id: int, 
    state_data: dict[str, List[GameStateRow]], 
    db=Depends(get_db), 
    user=Depends(require_user)
):
    verify_game_access(game_id, user["id"], db, "editor")
    cur = db.cursor()

    try:

        cur.execute("DELETE FROM game_states WHERE game_id = %s", (game_id,))
        
        #Edited by Wences Jacob Lorenzo
        insert_query = """ 
            INSERT INTO game_states (game_id, category, observation, time, quarter)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        for category, rows in state_data.items():
            for row in rows:
                cur.execute(insert_query, (game_id, category, row.text, row.time, row.quarter)) #Wences Jacob Lorenzo
        
        db.commit()
        return {"message": "Game state updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def _safe_pdf_text(value):
    return str(value or "").encode("latin-1", "replace").decode("latin-1")

def _wrap_pdf_text(pdf, text, width):
    words = _safe_pdf_text(text).split()
    if not words:
        return [""]

    max_width = width - 6
    lines = []
    current = ""
    for word in words:
        if pdf.get_string_width(word) > max_width:
            if current:
                lines.append(current)
                current = ""

            chunk = ""
            for char in word:
                candidate = f"{chunk}{char}"
                if pdf.get_string_width(candidate) <= max_width:
                    chunk = candidate
                else:
                    lines.append(chunk)
                    chunk = char

            if chunk:
                current = chunk
            continue

        candidate = f"{current} {word}".strip()
        if pdf.get_string_width(candidate) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word

    if current:
        lines.append(current)
    return lines

@router.post("/{game_id}/state/export/pdf")
def export_game_state_pdf(
    game_id: int,
    payload: GameStateExportRequest,
    db=Depends(get_db),
    user=Depends(require_user)
):
    verify_game_access(game_id, user["id"], db, "viewer")

    try:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        pdf.set_font("Helvetica", "B", 14)
        pdf.cell(0, 10, _safe_pdf_text(payload.title), ln=True)
        pdf.ln(2)

        metric_fields = [
            ("points", "Points"),
            ("total_yards", "Total Yards"),
            ("turnovers", "Turnovers"),
            ("penalties", "Penalties"),
            ("penalty_yards", "Penalty Yards"),
            ("third_down_conversions", "3rd Down Conversions"),
            ("third_down_attempts", "3rd Down Attempts"),
            ("time_of_possession", "Time of Possession"),
        ]

        metric_col_widths = {
            "quarter": 25,
            "metric": 80,
            "team": 40,
            "opponent": 40,
        }

        def draw_metrics_header():
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(metric_col_widths["quarter"], 8, "Quarter", border=1)
            pdf.cell(metric_col_widths["metric"], 8, "Metric", border=1)
            pdf.cell(metric_col_widths["team"], 8, "Team", border=1)
            pdf.cell(metric_col_widths["opponent"], 8, "Opponent", border=1, ln=True)
            pdf.set_font("Helvetica", "", 9)

        def draw_game_metrics_table():
            pdf.set_font("Helvetica", "B", 11)
            pdf.cell(0, 8, "Game Metrics - Quantitative", ln=True)

            metrics = payload.metrics or {}
            quarters = [
                quarter
                for quarter in ["Q1", "Q2", "Q3", "Q4"]
                if isinstance(metrics.get(quarter), dict)
            ]

            if not quarters:
                pdf.set_font("Helvetica", "", 9)
                pdf.cell(0, 8, "No quantitative metrics available.", ln=True)
                pdf.ln(4)
                return

            draw_metrics_header()

            for quarter in quarters:
                quarter_metrics = metrics.get(quarter) or {}

                for metric_key, metric_label in metric_fields:
                    if pdf.get_y() + 8 > pdf.page_break_trigger:
                        pdf.add_page()
                        draw_metrics_header()

                    team_value = quarter_metrics.get(metric_key, 0)
                    opponent_value = quarter_metrics.get(f"opp_{metric_key}", 0)

                    pdf.cell(metric_col_widths["quarter"], 8, quarter, border=1)
                    pdf.cell(metric_col_widths["metric"], 8, metric_label, border=1)
                    pdf.cell(metric_col_widths["team"], 8, _safe_pdf_text(team_value), border=1)
                    pdf.cell(metric_col_widths["opponent"], 8, _safe_pdf_text(opponent_value), border=1, ln=True)

            pdf.ln(6)

        draw_game_metrics_table()

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Game State Table - General Observations", ln=True)

        col_widths = {
            "observation": 130,
            "time": 27,
            "quarter": 28,
        }
        line_height = 6
        vertical_padding = 3
        min_row_height = 12
        header_height = 9

        def draw_header():
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(col_widths["observation"], header_height, "Observation", border=1)
            pdf.cell(col_widths["time"], header_height, "Time", border=1)
            pdf.cell(col_widths["quarter"], header_height, "Quarter", border=1, ln=True)
            pdf.set_font("Helvetica", "", 9)

        draw_header()

        pdf.set_font("Helvetica", "", 9)

        for row in payload.rows:
            observation = row.observation if row.observation is not None else row.text
            observation_lines = _wrap_pdf_text(pdf, observation, col_widths["observation"])
            time_text = _safe_pdf_text(row.time or "N/A")
            quarter_text = _safe_pdf_text(row.quarter or "N/A")
            row_height = max(
                min_row_height,
                (len(observation_lines) * line_height) + (vertical_padding * 2)
            )

            if pdf.get_y() + row_height > pdf.page_break_trigger:
                pdf.add_page()
                draw_header()

            x = pdf.get_x()
            y = pdf.get_y()

            pdf.rect(x, y, col_widths["observation"], row_height)
            pdf.rect(x + col_widths["observation"], y, col_widths["time"], row_height)
            pdf.rect(x + col_widths["observation"] + col_widths["time"], y, col_widths["quarter"], row_height)

            pdf.set_xy(x + 3, y + vertical_padding)
            for line in observation_lines:
                pdf.cell(col_widths["observation"] - 6, line_height, line, ln=True)

            pdf.set_xy(x + col_widths["observation"] + 3, y + vertical_padding)
            pdf.cell(col_widths["time"] - 6, line_height, time_text)

            pdf.set_xy(x + col_widths["observation"] + col_widths["time"] + 3, y + vertical_padding)
            pdf.cell(col_widths["quarter"] - 6, line_height, quarter_text)

            pdf.set_xy(x, y + row_height)

        pdf_bytes = pdf.output(dest="S")
        if isinstance(pdf_bytes, str):
            pdf_bytes = pdf_bytes.encode("latin-1")
        else:
            pdf_bytes = bytes(pdf_bytes)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="game_{game_id}_state_general.pdf"'
            }
        )
    except Exception as e:
        print(f"Game state PDF export failed for game {game_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Game state PDF export failed: {e}")
