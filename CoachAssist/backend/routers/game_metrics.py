"""
game_metrics.py

Handles per-game quantitative metrics for CoachAssist.

Features:
- Retrieve game metrics (by quarter + computed overall)
- Replace all game metrics for a game

Security:
- Requires authentication
- Verifies user has access to the game
- Prevents cross-team access (horizontal privilege escalation)
"""

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_game_role
from backend.schemas.game_metrics_schema import GameMetricsUpdate


router = APIRouter(
    prefix="/games",
    tags=["Game Metrics"]
)


# HELPER: Verify Game Access (Team Security)
def verify_game_access(game_id: int, user_id: int, db, required_role: str = "viewer"):
    require_game_role(game_id, user_id, db, required_role)


# =========================
# GET GAME METRICS
# =========================
@router.get("/{game_id}/metrics")
def get_game_metrics(
    game_id: int,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Retrieves all quantitative metrics for a game.

    Returns:
    - metrics: { Q1, Q2, Q3, Q4, overall }

    If no metrics exist yet, returns empty structure.
    """

    user_id = user["id"]
    verify_game_access(game_id, user_id, db)

    with db.cursor(cursor_factory=RealDictCursor) as cur:

        # Fetch all quarter rows
        cur.execute("""
            SELECT *
            FROM game_metrics
            WHERE game_id = %s
        """, (game_id,))

        rows = cur.fetchall()

        metrics_by_quarter = {}

        # Organize by quarter
        for row in rows:
            quarter = row.get("quarter", "overall")
            metrics_by_quarter[quarter] = row

        # Compute overall totals
        overall = {}

        for row in rows:
            for key, value in row.items():
                if key in ["id", "game_id", "quarter", "created_at"]:
                    continue
                overall[key] = overall.get(key, 0) + (value or 0)

        metrics_by_quarter["overall"] = overall

    return {
        "metrics": metrics_by_quarter
    }


# =========================
# PUT GAME METRICS (Replace-All)
# =========================
@router.put("/{game_id}/metrics")
def update_game_metrics(
    game_id: int,
    data: GameMetricsUpdate,
    db=Depends(get_db),
    user=Depends(require_user)
):
    """
    Replaces ALL game metrics for a given game.

    Strategy:
    1. Delete existing metrics
    2. Insert new metrics (per quarter)

    Ensures:
    - Frontend is source of truth
    - No partial updates
    - Clean synchronization
    """

    user_id = user["id"]
    verify_game_access(game_id, user_id, db, "editor")

    with db.cursor(cursor_factory=RealDictCursor) as cur:
        try:

            # =========================
            # DELETE EXISTING METRICS
            # =========================
            cur.execute("""
                DELETE FROM game_metrics
                WHERE game_id = %s
            """, (game_id,))

            # =========================
            # INSERT NEW METRICS
            # =========================
            for quarter, stats in data.metrics.items():

                if quarter == "overall":
                    continue

                if not stats:
                    continue

                # Convert Pydantic model → dict if needed
                if not isinstance(stats, dict):
                    stats = stats.dict(exclude_unset=True)

                # Get valid DB columns
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'game_metrics'
                """)
                valid_columns = {row["column_name"] for row in cur.fetchall()}

                excluded_columns = {"id", "game_id", "quarter", "created_at"}

                # Filter only valid columns
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
                    INSERT INTO game_metrics (
                        game_id,
                        quarter,
                        {columns}
                    )
                    VALUES (%s, %s, {placeholders})
                    """,
                    [game_id, quarter] + values
                )

            db.commit()

            return {
                "message": "Game metrics updated successfully"
            }

        except Exception as e:
            print("🔥 GAME METRICS ERROR:", e)
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )