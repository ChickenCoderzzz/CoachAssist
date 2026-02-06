from pydantic import BaseModel
from datetime import date
from typing import Optional


class MatchCreateSchema(BaseModel):
    name: str
    opponent: str
    game_date: date
    team_score: Optional[int] = None
    opponent_score: Optional[int] = None
    description: Optional[str] = None
