from pydantic import BaseModel

class TeamCreateSchema(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None