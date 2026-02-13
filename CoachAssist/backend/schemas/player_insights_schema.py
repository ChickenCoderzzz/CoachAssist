from pydantic import BaseModel
from typing import List, Optional


# ============================
# Player Stats Schema
# ============================

class PlayerStatsSchema(BaseModel):
    # UNIVERSAL
    snaps_played: Optional[int] = None
    penalties: Optional[int] = None
    turnovers: Optional[int] = None
    touchdowns: Optional[int] = None

    # PASSING
    pass_attempts: Optional[int] = None
    pass_completions: Optional[int] = None
    passing_yards: Optional[int] = None
    passing_tds: Optional[int] = None
    interceptions_thrown: Optional[int] = None

    # RUSHING
    rush_attempts: Optional[int] = None
    rushing_yards: Optional[int] = None
    rushing_tds: Optional[int] = None

    # RECEIVING
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


# ============================
# Player Notes Schema
# ============================

class PlayerNoteRow(BaseModel):
    id: Optional[int] = None
    category: Optional[str] = "General"
    note: str
    time: Optional[str] = None


# ============================
# Combined Update Schema
# ============================

class PlayerInsightsUpdate(BaseModel):
    stats: PlayerStatsSchema
    notes: List[PlayerNoteRow]
