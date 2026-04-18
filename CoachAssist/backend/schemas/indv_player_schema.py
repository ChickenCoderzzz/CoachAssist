"""
indv_player_schema.py

Pydantic schemas for individual player management.

Used by:
- Create player endpoint
- Update player endpoint
- Player response models

These schemas enforce:
- Valid football unit types
- Valid football position types
- Strict data validation before database insertion
"""

from pydantic import BaseModel
from typing import Literal, Optional

#=== ALLOWED UNIT TYPES ===
UnitType = Literal["offense", "defense", "special"]

#=== ALLOWED POSITION TYPES ===
PositionType = Literal[
    "QB","RB","FB","WR","TE","LT","LG","C","RG","RT",
    "DE","DT","NT","OLB","ILB","MLB","CB","FS","SS",
    "K","P","KR","PR","LS"
]

#=== CREATE PLAYER SCHEMA ===

class PlayerCreate(BaseModel):
    """
    Used when creating a new player.
    """

    team_id: int
    player_name: str
    jersey_number: int
    unit: UnitType
    position: PositionType
    is_priority: bool = False


#=== PLAYER OUTPUT SCHEMA ===

class PlayerOut(BaseModel):
    """
    Returned when sending player data back to frontend.
    """

    id: int
    athlete_id: int          #  REQUIRED
    team_id: int
    player_name: str
    jersey_number: int
    unit: UnitType
    position: PositionType
    is_priority: bool
    is_active: bool          #  REQUIRED


#=== UPDATE PLAYER SCHEMA ===

class PlayerUpdate(BaseModel):
    """
    Used for updating player details.
    """

    player_name: Optional[str] = None
    jersey_number: Optional[int] = None
    unit: Optional[UnitType] = None
    position: Optional[PositionType] = None  # allowed but ignored
    is_priority: Optional[bool] = None