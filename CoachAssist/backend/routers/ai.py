"""
ai.py

Handles AI-based analysis using Google Gemini.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.database import get_db
from google import genai
from psycopg2.extras import RealDictCursor
import os

router = APIRouter(prefix="/ai", tags=["AI"])

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ================= MODELS =================
class PlayerAnalysisRequest(BaseModel):
    payload: dict

class SaveAnalysisRequest(BaseModel):
    team_id: int
    player: dict
    analysis: str


# ================= AI =================
@router.post("/analyze-player")
async def analyze_player(data: PlayerAnalysisRequest):
    try:
        prompt = f"""
        You are a football performance analyst.

        Analyze the following player data and provide:

        1. Performance Summary
        2. Key Strengths
        3. Key Weaknesses
        4. Actionable Improvement Suggestions

        Data:
        {data.payload}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {"analysis": response.text}

    except Exception as e:
        print("AI ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ================= SAVE =================
@router.post("/save-player-analysis")
def save_player_analysis(
    data: SaveAnalysisRequest,
    db=Depends(get_db)
):
    try:
        print("SAVE HIT")

        with db.cursor() as cur:
            cur.execute("""
                INSERT INTO saved_player_analysis
                (team_id, player_id, player_name, position, jersey_number, analysis_text)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                data.team_id,
                data.player["id"],
                data.player["name"],
                data.player["position"],
                data.player["jersey_number"],
                data.analysis
            ))

        db.commit()  # 🔥 REQUIRED

        print("SAVE SUCCESS")

        return {"message": "Saved successfully"}

    except Exception as e:
        db.rollback()
        print("SAVE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ================= GET =================
@router.get("/saved-player-analysis/{team_id}")
def get_saved_player_analysis(team_id: int, db=Depends(get_db)):
    try:
        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT *
                FROM saved_player_analysis
                WHERE team_id = %s
                ORDER BY created_at DESC
            """, (team_id,))

            rows = cur.fetchall()

        print("FETCHED ROWS:", rows)

        return rows

    except Exception as e:
        print("FETCH ERROR:", e)
        return []
    
@router.delete("/delete-player-analysis/{analysis_id}")
def delete_player_analysis(analysis_id: int, db=Depends(get_db)):
    try:
        with db.cursor() as cur:
            cur.execute("""
                DELETE FROM saved_player_analysis
                WHERE id = %s
            """, (analysis_id,))

        db.commit()
        return {"message": "Deleted successfully"}

    except Exception as e:
        db.rollback()
        print("DELETE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))