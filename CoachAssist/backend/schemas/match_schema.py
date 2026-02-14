"""
match_schema.py

Pydantic schema for creating and updating matches (games).

Used by:
- Create match endpoint
- Update match endpoint

Provides:
- Type validation
- Automatic date parsing
- Optional score handling
"""

from pydantic import BaseModel
from datetime import date
from typing import Optional

class MatchCreateSchema(BaseModel):
    """
    Schema used when:
    - Creating a new match
    - Updating an existing match

    Fields:
    - name: Display name of the game (e.g., "Week 3 vs Lincoln")
    - opponent: Opposing team name
    - game_date: Date of the game (ISO format, auto-validated)
    - team_score: Optional final score for user's team
    - opponent_score: Optional final score for opponent
    - description: Optional notes about the game
    """
    
    name: str
    opponent: str
    game_date: date
    team_score: Optional[int] = None
    opponent_score: Optional[int] = None
    description: Optional[str] = None
