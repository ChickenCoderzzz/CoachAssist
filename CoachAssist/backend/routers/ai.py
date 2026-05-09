"""
ai.py

Handles AI-based analysis using Google Gemini.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_team_role
from google import genai
from psycopg2.extras import RealDictCursor
import os

router = APIRouter(prefix="/ai", tags=["AI"])

# Initialize Gemini client using environment variable API key
# Ensure GEMINI_API_KEY is configured in the backend environment
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

class GameComparisonRequest(BaseModel):
    team_id: int
    game_one_id: int
    game_two_id: int
    payload: dict

class PlayerComparisonRequest(BaseModel):
    team_id: int
    player_one_id: int
    player_two_id: int
    payload: dict

class SaveGameAnalysisRequest(BaseModel):
    team_id: int
    game_id: int
    game: dict
    analysis: str

# ================= ACCESS CONTROL HELPERS =================
# These helper functions validate whether the authenticated
# user has permission to access specific team, game,
# or player-related resources.

# Verify that the requesting user owns or has access to the specified team before allowing operations
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

# Ensure the player belongs to the requested team and that the user has authorization to access player data
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


# Ensure the player belongs to the requested team and that the user has authorization to access player data
def verify_player_access(team_id: int, player_id: int, user_id: int, db):
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT p.id
            FROM indv_players p
            JOIN teams t ON p.team_id = t.id
            WHERE p.id = %s
              AND p.team_id = %s
              AND t.user_id = %s
            """,
            (player_id, team_id, user_id)
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=403, detail="Access denied to this player")


# Promp AI model to analyze player
@router.post("/analyze-player")
async def analyze_player(data: PlayerAnalysisRequest, user=Depends(require_user)):
    try:
        prompt = f"""
        You are a football performance analyst.

        Analyze the following player data and provide:

        1. Performance Summary
        2. Key Strengths
        3. Key Weaknesses
        4. Actionable Improvement Suggestions

        Use BOTH:
        - Total stats per game (totals)
        - Quarter-by-quarter breakdowns (quarters)

        When analyzing, focus on:

        - Trends across quarters (e.g., improvement or decline from Q1 to Q4)
        - Consistency vs variability within each game
        - Signs of fatigue (strong early performance but weaker later quarters)
        - Strong or weak halves (Q1–Q2 vs Q3–Q4)
        - Notable spikes or drop-offs in specific quarters
        - How performance aligns with notes/insights

        For each game:
        - Briefly summarize overall performance
        - Highlight any important quarter-level patterns

        Then provide:
        - Overall trends across all games
        - The player’s strongest areas
        - The player’s weakest areas
        - Specific, actionable coaching suggestions

        - Pay special attention to selected quarters if provided

        Keep the analysis concise but insightful.

        Data:
        {data.payload}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        analysis_text = None

        try:
            analysis_text = response.text
        except:
            try:
                analysis_text = response.candidates[0].content.parts[0].text
            except:
                analysis_text = None

        if not analysis_text:
            analysis_text = "AI analysis unavailable. Please try again."

        return {"analysis": analysis_text}

    except Exception as e:
        print("AI ERROR:", e)
        return {"analysis": "An error occurred while generating analysis."}


# Save player analysis outputs
@router.post("/save-player-analysis")
def save_player_analysis(
    data: SaveAnalysisRequest,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        require_team_role(data.team_id, user["id"], db, "editor")

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

        db.commit()  #  REQUIRED

        print("SAVE SUCCESS")

        return {"message": "Saved successfully"}

    except Exception as e:
        db.rollback()
        print("SAVE ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))


# Retrieve AI analysis outputs
@router.get("/saved-player-analysis/{team_id}")
def get_saved_player_analysis(team_id: int, db=Depends(get_db), user=Depends(require_user)):
    try:
        require_team_role(team_id, user["id"], db, "viewer")

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
def delete_player_analysis(analysis_id: int, db=Depends(get_db), user=Depends(require_user)):
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

#Prompt Gemini to analyze game data
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

        Analyze the following game data and provide:

        1. Overall Game Summary
        2. Offensive Strengths and Weaknesses
        3. Defensive Strengths and Weaknesses
        4. Special Teams Notes
        5. Key Turning Points
        6. Most Important Coaching Takeaways
        7. Actionable Recommendations for the Next Game

        Use BOTH:
        - Overall game data
        - Quarter-specific data (if available)
        - The game_metrics section (overall and quarter-by-quarter)

        Focus on:
        - Momentum shifts between quarters
        - Strong vs weak halves (Q1–Q2 vs Q3–Q4)
        - Key turning points by quarter
        - Situational performance (early vs late game)
        - How notes and stats align within specific quarters
        - How game_metrics supports conclusions about momentum, execution, and efficiency

        - Pay special attention to selected quarters if provided

        Rules:
        - Do not invent statistics that are not present in the payload.
        - If a metric is missing, state that it is unavailable instead of assuming values.

        Keep analysis concise, practical, and coaching-focused.

        Game Data:
        {data.payload}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        analysis_text = None

        try:
            analysis_text = response.text
        except:
            try:
                analysis_text = response.candidates[0].content.parts[0].text
            except:
                analysis_text = None

        if not analysis_text:
            analysis_text = "AI analysis unavailable. Please try again."

        return {"analysis": analysis_text}
    except HTTPException:
        raise
    except Exception as e:
        print("GAME AI ERROR:", e)
        return {"analysis": "An error occurred while generating analysis."}

#PRompt Gemini to compare game data
@router.post("/compare-games")
async def compare_games(
    data: GameComparisonRequest,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        if data.game_one_id == data.game_two_id:
            raise HTTPException(status_code=400, detail="Select two different games for comparison")

        verify_game_access(data.team_id, data.game_one_id, user["id"], db)
        verify_game_access(data.team_id, data.game_two_id, user["id"], db)

        prompt = f"""
        You are an American football coaching analyst.

        Compare the two provided games and explain why performance changed between them.
        This is a side-by-side comparison task, not a single-game analysis.

        Provide:
        1. Overall Comparison Summary
        2. Biggest Differences Between Games
        3. Why Performance Improved or Declined
        4. Key Metric Differences
        5. Unit-by-Unit Comparison
        6. Player/Note Pattern Differences
        7. Coaching Takeaways for Future Games

        Use:
        - game metadata
        - game_state observations
        - game_metrics (overall and quarter-by-quarter)
        - unit summaries
        - player stats and notes

        Rules:
        - Do not invent statistics that are not present in the payload.
        - Only use metrics, observations, and notes provided in the payload.
        - If a value is missing, state it is unavailable.
        - Do not claim causation unless the data supports it; use cautious language when needed.

        Keep the response concise, practical, and coaching-focused.

        Comparison Data:
        {data.payload}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        comparison_text = None

        try:
            comparison_text = response.text
        except:
            try:
                comparison_text = response.candidates[0].content.parts[0].text
            except:
                comparison_text = None

        if not comparison_text:
            comparison_text = "AI comparison unavailable. Please try again."

        return {"comparison": comparison_text}
    except HTTPException:
        raise
    except Exception as e:
        print("COMPARE GAMES AI ERROR:", e)
        return {"comparison": "An error occurred while generating comparison."}

#Prompt gemini to compare player data
@router.post("/compare-players")
async def compare_players(
    data: PlayerComparisonRequest,
    db=Depends(get_db),
    user=Depends(require_user)
):
    try:
        if data.player_one_id == data.player_two_id:
            raise HTTPException(status_code=400, detail="Select two different players for comparison")

        verify_player_access(data.team_id, data.player_one_id, user["id"], db)
        verify_player_access(data.team_id, data.player_two_id, user["id"], db)

        player_one_position = (
            (data.payload or {})
            .get("player_one", {})
            .get("player", {})
            .get("position")
        )
        player_two_position = (
            (data.payload or {})
            .get("player_two", {})
            .get("player", {})
            .get("position")
        )
        positions_differ = (
            bool(player_one_position) and
            bool(player_two_position) and
            player_one_position != player_two_position
        )

        cross_position_guidance = ""
        if positions_differ:
            cross_position_guidance = """
        Position Context:
        - The two players play different positions.
        - Focus on comparing their role-specific contributions, strengths, and situational impact rather than direct stat equivalence.
        - When positions differ, avoid misleading stat comparisons and instead explain differences in responsibilities and impact on the game.
            """

        prompt = f"""
        You are an American football coaching analyst.

        Compare the two provided players using only the supplied data.
        This is a side-by-side player comparison task, not a single-player analysis.

        Provide:
        1. Overall Player Comparison
        2. Key Statistical Differences
        3. Strengths and Weaknesses
        4. Situational Performance
        5. Consistency Across Games
        6. Notes/Observation Pattern Differences
        7. Coaching Recommendation

        Rules:
        - Do not invent statistics.
        - Only compare based on the provided payload.
        - If data is missing, state it is unavailable.
        - Do not automatically label one player as better unless supported by the data.
        - Use cautious coaching language such as "based on the available data."
{cross_position_guidance}

        Keep the response concise, practical, and coaching-focused.

        Player Comparison Data:
        {data.payload}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        comparison_text = None

        try:
            comparison_text = response.text
        except:
            try:
                comparison_text = response.candidates[0].content.parts[0].text
            except:
                comparison_text = None

        if not comparison_text:
            comparison_text = "AI comparison unavailable. Please try again."

        return {"comparison": comparison_text}
    except HTTPException:
        raise
    except Exception as e:
        print("COMPARE PLAYERS AI ERROR:", e)
        return {"comparison": "An error occurred while generating comparison."}

# Retrieve previously saved AI-generated analyses ordered by newest entries first
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

# Remove saved AI analysis entry from the database
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
