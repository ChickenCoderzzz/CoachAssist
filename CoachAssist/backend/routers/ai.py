"""
ai.py

Handles AI-based analysis using Google Gemini.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.database import get_db
from backend.routers.auth import require_user
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

class GameAnalysisRequest(BaseModel):
    team_id: int
    game_id: int
    payload: dict

class SaveGameAnalysisRequest(BaseModel):
    team_id: int
    game_id: int
    game: dict
    analysis: str


def verify_team_access(team_id: int, user_id: int, db):
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT id
            FROM teams
            WHERE id = %s AND user_id = %s
            """,
            (team_id, user_id)
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=403, detail="Access denied to this team")


def verify_game_access(team_id: int, game_id: int, user_id: int, db):
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT m.id
            FROM matches m
            JOIN teams t ON m.team_id = t.id
            WHERE m.id = %s
              AND m.team_id = %s
              AND t.user_id = %s
            """,
            (game_id, team_id, user_id)
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=403, detail="Access denied to this game")


# Promp AI model to analyze player
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


# Save player analysis outputs
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


# Retrieve AI analysis outputs
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

# Delete AI analysis outputs
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


@router.post("/analyze-game")
async def analyze_game(
    data: GameAnalysisRequest,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        verify_game_access(data.team_id, data.game_id, user["id"], db)

        prompt = f"""
        You are an American football coaching analyst.

        Analyze the following game data and provide a concise, practical report with these sections:
        1. Overall Game Summary
        2. Offensive Strengths and Weaknesses
        3. Defensive Strengths and Weaknesses
        4. Special Teams Notes
        5. Key Turning Points
        6. Most Important Coaching Takeaways
        7. Actionable Recommendations for the Next Game

        Requirements:
        - Use clear coaching language
        - Call out patterns from observations, player stats, and notes
        - Mention game context (opponent, score, date) when relevant
        - Keep recommendations specific and implementable

        Game Data:
        {data.payload}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return {"analysis": response.text}
    except HTTPException:
        raise
    except Exception as e:
        print("GAME AI ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-game-analysis")
def save_game_analysis(
    data: SaveGameAnalysisRequest,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        verify_game_access(data.team_id, data.game_id, user["id"], db)

        with db.cursor() as cur:
            cur.execute(
                """
                INSERT INTO saved_game_analysis
                (team_id, game_id, game_name, opponent, game_date, analysis_text)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    data.team_id,
                    data.game_id,
                    data.game.get("name"),
                    data.game.get("opponent"),
                    data.game.get("date"),
                    data.analysis
                )
            )

        db.commit()
        return {"message": "Saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print("SAVE GAME ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/saved-game-analysis/{team_id}")
def get_saved_game_analysis(
    team_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        verify_team_access(team_id, user["id"], db)

        with db.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM saved_game_analysis
                WHERE team_id = %s
                ORDER BY created_at DESC
                """,
                (team_id,)
            )
            rows = cur.fetchall()

        return rows
    except HTTPException:
        raise
    except Exception as e:
        print("FETCH GAME SAVED ERROR:", e)
        return []


@router.delete("/delete-game-analysis/{analysis_id}")
def delete_game_analysis(
    analysis_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        with db.cursor() as cur:
            cur.execute(
                """
                DELETE FROM saved_game_analysis sga
                USING teams t
                WHERE sga.id = %s
                  AND sga.team_id = t.id
                  AND t.user_id = %s
                RETURNING sga.id
                """,
                (analysis_id, user["id"])
            )
            deleted = cur.fetchone()

        if not deleted:
            raise HTTPException(status_code=404, detail="Saved analysis not found")

        db.commit()
        return {"message": "Deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print("DELETE GAME ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))
