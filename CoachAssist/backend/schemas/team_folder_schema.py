from pydantic import BaseModel
from typing import Optional

class TeamCreateSchema(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None