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
from backend.routers.team_access import require_team_role

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

        # Verify Player Access
        cur.execute(
            "SELECT id, team_id FROM indv_players WHERE id = %s",
            (player_id,)
        )

        player = cur.fetchone()

        if not player:
            raise HTTPException(
                status_code=404,
                detail="Player not found"
            )

        require_team_role(player["team_id"], user_id, db, "viewer")

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
            AND quarter != 'overall'
            """,
            (player_id,)
        )

        raw_stats = cur.fetchall()

        stats_by_game = {}

        for row in raw_stats:
            game_id = row["game_id"]

            if game_id not in stats_by_game:
                stats_by_game[game_id] = {}

            for key, value in row.items():
                if key in ["id", "player_id", "game_id", "quarter", "created_at"]:
                    continue

                if value is None:
                    continue

                stats_by_game[game_id][key] = (
                    stats_by_game[game_id].get(key, 0) + value
                )

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
        "stats_by_game": stats_by_game,
        "notes": notes
    }