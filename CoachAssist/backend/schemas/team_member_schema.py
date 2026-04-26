from pydantic import BaseModel


class InviteMemberSchema(BaseModel):
    identifier: str  # email or username
    role: str = "viewer"


class UpdateMemberRoleSchema(BaseModel):
    role: str
