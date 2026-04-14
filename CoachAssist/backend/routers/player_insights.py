"""
player_insights.py

Handles per-game player analysis data for CoachAssist.

Features:
- Retrieve player stats + notes for a specific game
- Replace all player stats and notes for a game

Security:
- Requires authentication
- Verifies user owns the team associated with the game
- Prevents cross-team access (horizontal privilege escalation)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg2.extras import RealDictCursor
from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_game_role
from backend.schemas.player_insights_schema import PlayerInsightsUpdate

router = APIRouter(
    prefix="/games",
    tags=["Player Insights"]
)

# HELPER: Verify Game Ownership (Team Security)

def verify_game_access(game_id: int, user_id: int, db, required_role: str = "viewer"):
    """
    Ensures the user has at least the required role for the game's team.
    """
    require_game_role(game_id, user_id, db, required_role)

# GET PLAYER INSIGHTS (Stats + Notes)

@router.get("/{game_id}/players/{player_id}")
def get_player_insights(
    game_id: int,
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Retrieves all analysis data for a player in a specific game.

    Returns:
    - stats: aggregated statistical values
    - notes: chronological list of observation entries

    If no stats exist yet, returns an empty stats object.
    """

    user_id = user["id"]

    #Ensure user owns this game
    verify_game_access(game_id, user_id, db)

    with db.cursor(cursor_factory=RealDictCursor) as cur:

        # Fetch Stats (ALL QUARTERS)
        cur.execute("""
            SELECT *
            FROM player_stats
            WHERE player_id = %s AND game_id = %s
        """, (player_id, game_id))

        stats_rows = cur.fetchall()

        # Organize by quarter
        stats_by_quarter = {}

        for row in stats_rows:
            quarter = row.get("quarter", "overall")
            stats_by_quarter[quarter] = row

        # Compute overall totals
        overall = {}

        for row in stats_rows:
            for key, value in row.items():
                if key in ["id", "player_id", "game_id", "quarter", "created_at"]:
                    continue
                overall[key] = overall.get(key, 0) + (value or 0)

        stats_by_quarter["overall"] = overall

        # Fetch Notes - By Wences Jacob Lorenzo
        cur.execute("""
            SELECT id, category, note, time, quarter
            FROM player_notes
            WHERE player_id = %s AND game_id = %s
            ORDER BY created_at ASC
        """, (player_id, game_id))

        notes = cur.fetchall()

    return {
        "stats": stats_by_quarter,
        "notes": notes
    }

# PUT PLAYER INSIGHTS (Replace-All Logic)

@router.put("/{game_id}/players/{player_id}")
def update_player_insights(
    game_id: int,
    player_id: int,
    data: PlayerInsightsUpdate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Replaces ALL player insights for a given game.

    Strategy:
    1. Delete existing stats row
    2. Insert new stats (if provided)
    3. Delete existing notes
    4. Insert all provided notes

    This ensures:
    - Frontend state remains source-of-truth
    - No partial updates
    - Clean synchronization between UI and database
    """

    user_id = user["id"]
    verify_game_access(game_id, user_id, db, "editor")

    with db.cursor(cursor_factory=RealDictCursor) as cur:
        try:

            # Replace Stats

            #Remove existing stats for player + game
            cur.execute("""
                DELETE FROM player_stats
                WHERE player_id = %s AND game_id = %s
            """, (player_id, game_id))

            #Convert pydantic model to dictionary
            stats_dict = {}

            for quarter, stats in data.stats.items():
                if quarter == "overall":
                    continue

                # If it's already a dict, use it directly
                if isinstance(stats, dict):
                    stats_dict[quarter] = stats
                else:
                    stats_dict[quarter] = stats.dict(exclude_unset=True)

            #Insert if stats provided
            for quarter, stats in stats_dict.items():
                if quarter == "overall":
                    continue

                if not stats:
                    continue

                # Get valid DB columns
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'player_stats'
                """)
                valid_columns = {row["column_name"] for row in cur.fetchall()}

                # Filter only valid columns
                excluded_columns = {"id", "player_id", "game_id", "quarter", "created_at"}

                filtered_stats = {
                    k: v for k, v in stats.items()
                    if k in valid_columns and k not in excluded_columns
                }

                if not filtered_stats:
                    continue

                columns = ", ".join(filtered_stats.keys())
                placeholders = ", ".join(["%s"] * len(filtered_stats))
                values = list(filtered_stats.values())

                cur.execute(
                    f"""
                    INSERT INTO player_stats (
                        player_id,
                        game_id,
                        quarter,
                        {columns}
                    )
                    VALUES (%s, %s, %s, {placeholders})
                    """,
                    [player_id, game_id, quarter] + values
                )

            # Replace Notes - By Wences Jacob Lorenzo

            #Remove existing notes
            cur.execute("""
                DELETE FROM player_notes
                WHERE player_id = %s AND game_id = %s
            """, (player_id, game_id))

            #Insert all notes provided from frontend
            for note in data.notes:
                cur.execute("""
                    INSERT INTO player_notes (
                        player_id,
                        game_id,
                        category,
                        note,
                        time,
                        quarter
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    player_id,
                    game_id,
                    note.category if hasattr(note, "category") else "General",
                    note.note,
                    note.time,
                    note.quarter
                ))

            #db.commit()
            db.commit()

            return {
                "message": "Player insights updated successfully"
            }

        except Exception as e:
            print("🔥 BACKEND ERROR:", e)   # 👈 ADD THIS
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )
