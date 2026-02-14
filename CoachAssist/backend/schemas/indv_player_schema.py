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
#Restricts unit values to valid football team categories
#Prevents invalid data

UnitType = Literal["offense", "defense", "special"]

#=== ALLOWED POSITION TYPES===
#Restricts positions to valid football roles
#Ensures frontend and backend consistency

PositionType = Literal[
    "QB","RB","FB","WR","TE","LT","LG","C","RG","RT",
    "DE","DT","NT","OLB","ILB","MLB","CB","FS","SS",
    "K","P","KR","PR","LS"
]

#=== CREATE PLAYER SCHEMA ===

class PlayerCreate(BaseModel):
    """
    Used when creating a new player.

    All fields are required.
    Validation ensures:
    - team_id exists
    - jersey_number is integer
    - unit and position match allowed values
    """

    team_id: int
    player_name: str
    jersey_number: int
    unit: UnitType
    position: PositionType

#=== PLAYER OUTPUT SCHEMA ===

class PlayerOut(BaseModel):
    """
    Returned when sending player data back to frontend.

    Mirrors database structure.
    """

    id: int
    team_id: int
    player_name: str
    jersey_number: int
    unit: UnitType
    position: PositionType

#=== UPDATE PLAYER SCHEMA ===

class PlayerUpdate(BaseModel):
    """
    Used for updating player details.

    All fields are optional to allow partial updates.
    Only provided fields will be modified.
    """

    player_name: Optional[str] = None
    jersey_number: Optional[int] = None
    unit: Optional[UnitType] = None
    position: Optional[PositionType] = None
