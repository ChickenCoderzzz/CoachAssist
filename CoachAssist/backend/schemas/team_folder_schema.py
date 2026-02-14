"""
team_folder_schema.py

Schema for creating and updating team folders in CoachAssist.

Used by:
- Create team endpoint
- Update team endpoint

Provides validation for:
- Team name (required)
- Optional description
- Optional image URL
"""


from pydantic import BaseModel
from typing import Optional

class TeamCreateSchema(BaseModel):
    """
    Represents the data required to create or update a team.

    Fields:
    - name: Display name of the team (required)
    - description: Optional team description
    - image_url: Optional image for UI display (e.g., logo or banner)
    """

    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None