"""
player_history.py

Handles aggregated player analytics across all games.

Features:
- Aggregated metric totals
- Per-game metric breakdown
- Player insights across games

Security:
- Requires authentication
- Verifies player belongs to user's team
"""

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from typing import Optional
from backend.database import get_db
from backend.routers.auth import require_user

router = APIRouter(
    prefix="/players",
    tags=["Player History"]
)


@router.get("/{player_id}/history")
def get_player_history(
    player_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Returns full player history across all games.

    Includes:
    - All games
    - Stats per game
    - Notes per game
    """

    user_id = user["id"]

    with db.cursor(cursor_factory=RealDictCursor) as cur:

        # Verify Player Ownership
        cur.execute(
            """
            SELECT p.id, p.team_id
            FROM indv_players p
            JOIN teams t ON p.team_id = t.id
            WHERE p.id = %s AND t.user_id = %s
            """,
            (player_id, user_id)
        )

        player = cur.fetchone()

        if not player:
            raise HTTPException(
                status_code=404,
                detail="Player not found or access denied"
            )

        team_id = player["team_id"]

        # Get All Games
        cur.execute(
            """
            SELECT id, name, opponent, game_date,
                   team_score, opponent_score
            FROM matches
            WHERE team_id = %s
            ORDER BY game_date DESC
            """,
            (team_id,)
        )

        games = cur.fetchall()

        # Get Player Stats
        cur.execute(
            """
            SELECT *
            FROM player_stats
            WHERE player_id = %s
            """,
            (player_id,)
        )

        stats = cur.fetchall()

        # Get Player Notes
        cur.execute(
            """
            SELECT n.*, m.opponent, m.game_date
            FROM player_notes n
            JOIN matches m ON n.game_id = m.id
            WHERE n.player_id = %s
            ORDER BY m.game_date DESC, n.created_at ASC
            """,
            (player_id,)
        )

        notes = cur.fetchall()

    return {
        "games": games,
        "stats_by_game": stats,
        "notes": notes
    }