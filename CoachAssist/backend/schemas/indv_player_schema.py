from pydantic import BaseModel
from typing import Literal, Optional

UnitType = Literal["offense", "defense", "special"]

PositionType = Literal[
    "QB","RB","FB","WR","TE","LT","LG","C","RG","RT",
    "DE","DT","NT","OLB","ILB","MLB","CB","FS","SS",
    "K","P","KR","PR","LS"
]

class PlayerCreate(BaseModel):
    team_id: int
    player_name: str
    jersey_number: int
    unit: UnitType
    position: PositionType


class PlayerOut(BaseModel):
    id: int
    team_id: int
    player_name: str
    jersey_number: int
    unit: UnitType
    position: PositionType

class PlayerUpdate(BaseModel):
    player_name: Optional[str] = None
    jersey_number: Optional[int] = None
    unit: Optional[UnitType] = None
    position: Optional[PositionType] = None
