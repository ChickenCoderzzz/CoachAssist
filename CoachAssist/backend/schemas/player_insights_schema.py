"""
player_insights_schema.py

Schemas used for per-game player analysis in CoachAssist.

Includes:
- Player statistical tracking
- Player observation notes
- Combined update model for replacing insights

All fields are optional for stats to allow flexible,
position-based stat tracking.
"""

from pydantic import BaseModel
from typing import List, Optional

#=== Player Stats Schema ===

class PlayerStatsSchema(BaseModel):
    """
    Represents all possible trackable stats for a player in a single game.

    All fields are Optional because:
    - Not all positions track the same stats
    - Frontend may only send relevant fields
    - Update route uses dynamic insertion logic
    """

    # UNIVERSAL (All positions)
    snaps_played: Optional[int] = None
    penalties: Optional[int] = None
    turnovers: Optional[int] = None
    touchdowns: Optional[int] = None

    # PASSING (QB primarily)
    pass_attempts: Optional[int] = None
    pass_completions: Optional[int] = None
    passing_yards: Optional[int] = None
    passing_tds: Optional[int] = None
    interceptions_thrown: Optional[int] = None

    # RUSHING (RB/QB/WR)
    rush_attempts: Optional[int] = None
    rushing_yards: Optional[int] = None
    rushing_tds: Optional[int] = None

    # RECEIVING (WR/TE/RB)
    receptions: Optional[int] = None
    receiving_yards: Optional[int] = None
    receiving_tds: Optional[int] = None

    # OFFENSIVE LINE
    sacks_allowed: Optional[int] = None

    # DEFENSE
    tackles: Optional[int] = None
    sacks: Optional[int] = None
    interceptions: Optional[int] = None
    forced_fumbles: Optional[int] = None
    fumbles_recovered: Optional[int] = None
    passes_defended: Optional[int] = None

    # SPECIAL TEAMS
    field_goals_made: Optional[int] = None
    field_goals_attempted: Optional[int] = None
    extra_points_made: Optional[int] = None

    punts: Optional[int] = None
    punt_yards: Optional[int] = None

    kick_returns: Optional[int] = None
    kick_return_yards: Optional[int] = None
    kick_return_tds: Optional[int] = None

    punt_returns: Optional[int] = None
    punt_return_yards: Optional[int] = None
    punt_return_tds: Optional[int] = None

#=== Player Notes Schema ===
#Following Code by Wences Jacob Lorenzo

class PlayerNoteRow(BaseModel):
    """
    Represents a single observation entry for a player in a game.

    Fields:
    - id: Optional database ID (used when returning notes)
    - category: Note classification (default = "General")
    - note: The actual observation text
    - time: Timestamp or game clock reference (e.g., "Q2 03:45")
    """

    id: Optional[int] = None
    category: Optional[str] = "General"
    note: str
    time: Optional[str] = None

#=== Combined Update Schema ===

class PlayerInsightsUpdate(BaseModel):
    stats: PlayerStatsSchema
    notes: List[PlayerNoteRow]
