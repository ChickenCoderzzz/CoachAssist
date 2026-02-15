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
from backend.schemas.player_insights_schema import PlayerInsightsUpdate

router = APIRouter(
    prefix="/games",
    tags=["Player Insights"]
)

# HELPER: Verify Game Ownership (Team Security)

def verify_game_access(game_id: int, user_id: int, db):
    """
    Ensures that the authenticated user owns the team
    associated with the requested game.

    Prevents unauthorized access to:
    - Player stats
    - Player notes
    - Game analysis data
    """

    with db.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT m.id
            FROM matches m
            JOIN teams t ON m.team_id = t.id
            WHERE m.id = %s AND t.user_id = %s
        """, (game_id, user_id))

        game = cur.fetchone()

        if not game:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this game"
            )

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

        # Fetch Stats
        cur.execute("""
            SELECT *
            FROM player_stats
            WHERE player_id = %s AND game_id = %s
        """, (player_id, game_id))

        stats = cur.fetchone()

        #Return empty object if no stats
        if not stats:
            stats = {}

        # Fetch Notes - By Wences Jacob Lorenzo
        cur.execute("""
            SELECT id, category, note, time
            FROM player_notes
            WHERE player_id = %s AND game_id = %s
            ORDER BY created_at ASC
        """, (player_id, game_id))

        notes = cur.fetchall()

    return {
        "stats": stats,
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
    verify_game_access(game_id, user_id, db)

    with db.cursor(cursor_factory=RealDictCursor) as cur:
        try:

            # Replace Stats

            #Remove existing stats for player + game
            cur.execute("""
                DELETE FROM player_stats
                WHERE player_id = %s AND game_id = %s
            """, (player_id, game_id))

            #Convert pydantic model to dictionary
            stats_dict = data.stats.dict(exclude_unset=True)

            #Insert if stats provided
            if stats_dict:
                columns = ", ".join(stats_dict.keys())
                placeholders = ", ".join(["%s"] * len(stats_dict))
                values = list(stats_dict.values())

                cur.execute(
                    f"""
                    INSERT INTO player_stats (
                        player_id,
                        game_id,
                        {columns}
                    )
                    VALUES (%s, %s, {placeholders})
                    """,
                    [player_id, game_id] + values
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
                        time
                    )
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    player_id,
                    game_id,
                    note.category if hasattr(note, "category") else "General",
                    note.note,
                    note.time
                ))

            #db.commit()
            db.commit()

            return {
                "message": "Player insights updated successfully"
            }

        except Exception as e:
            #Roll back entire operation if failure occurs
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )
