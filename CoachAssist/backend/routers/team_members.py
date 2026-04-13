"""
team_members.py

Handles team sharing and member management.

Features:
- Invite members by email
- Accept/decline invitations
- List team members
- Update member roles
- Remove members

All routes require authentication.
"""

from fastapi import APIRouter, Depends, HTTPException
from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_team_role
from backend.schemas.team_member_schema import (
    InviteMemberSchema,
    UpdateMemberRoleSchema,
)

router = APIRouter(
    tags=["Team Members"]
)


# =====================================================
# LIST MEMBERS
# =====================================================

@router.get("/teams/{team_id}/members")
def get_team_members(team_id: int, user=Depends(require_user)):
    """
    Returns all members of a team.
    Any team member (viewer+) can see the member list.
    """
    db = get_db()
    try:
        require_team_role(team_id, user["id"], db, "viewer")

        cur = db.cursor()
        cur.execute(
            """
            SELECT tm.id, tm.team_id, tm.user_id, tm.role,
                   tm.invited_email, tm.status, tm.invited_at, tm.accepted_at,
                   u.username, u.full_name
            FROM team_members tm
            LEFT JOIN users u ON tm.user_id = u.id
            WHERE tm.team_id = %s
            ORDER BY
                CASE tm.role
                    WHEN 'owner' THEN 1
                    WHEN 'editor' THEN 2
                    WHEN 'viewer' THEN 3
                END,
                tm.invited_at ASC
            """,
            (team_id,)
        )
        members = cur.fetchall()
        cur.close()
        return {"members": members}
    finally:
        db.close()


# =====================================================
# INVITE MEMBER
# =====================================================

@router.post("/teams/{team_id}/members/invite")
def invite_member(team_id: int, data: InviteMemberSchema, user=Depends(require_user)):
    """
    Invites a new member to the team by email or username.
    Only the team owner can invite members.
    The invited user must have an existing account.
    """
    if data.role not in ("editor", "viewer"):
        raise HTTPException(status_code=400, detail="Role must be 'editor' or 'viewer'")

    db = get_db()
    try:
        require_team_role(team_id, user["id"], db, "owner")

        cur = db.cursor()
        identifier = data.identifier.strip().lower()

        # Look up user by email or username
        cur.execute(
            "SELECT id, email, username FROM users WHERE LOWER(email) = %s OR LOWER(username) = %s",
            (identifier, identifier)
        )
        invited_user = cur.fetchone()

        if not invited_user:
            raise HTTPException(status_code=404, detail="User not found. They must have a CoachAssist account.")

        # Cannot invite yourself
        if invited_user["id"] == user["id"]:
            raise HTTPException(status_code=400, detail="You cannot invite yourself")

        # Check if already a member
        cur.execute(
            "SELECT id, status FROM team_members WHERE team_id = %s AND user_id = %s",
            (team_id, invited_user["id"])
        )
        existing = cur.fetchone()
        if existing:
            if existing["status"] == "accepted":
                raise HTTPException(status_code=409, detail="This user is already a team member")
            else:
                raise HTTPException(status_code=409, detail="An invite has already been sent to this user")

        cur.execute(
            """
            INSERT INTO team_members (team_id, user_id, role, invited_email, status)
            VALUES (%s, %s, %s, %s, 'pending')
            RETURNING id, team_id, user_id, role, invited_email, status, invited_at
            """,
            (team_id, invited_user["id"], data.role, invited_user["email"].lower())
        )
        member = cur.fetchone()
        db.commit()
        cur.close()

        return {"member": dict(member)}
    finally:
        db.close()


# =====================================================
# ACCEPT INVITE
# =====================================================

@router.post("/team-members/invites/{invite_id}/accept")
def accept_invite(invite_id: int, user=Depends(require_user)):
    """
    Accept a team invitation. The invite must belong to the authenticated user's email.
    """
    db = get_db()
    try:
        cur = db.cursor()
        user_email = user["email"].strip().lower()

        cur.execute(
            """
            SELECT tm.id, tm.team_id, t.name as team_name
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE tm.id = %s
              AND (LOWER(tm.invited_email) = %s OR tm.user_id = %s)
              AND tm.status = 'pending'
            """,
            (invite_id, user_email, user["id"])
        )
        invite = cur.fetchone()

        if not invite:
            raise HTTPException(status_code=400, detail="Invite not found or already accepted")

        cur.execute(
            """
            UPDATE team_members
            SET status = 'accepted',
                user_id = %s,
                accepted_at = NOW()
            WHERE id = %s
            RETURNING id, team_id, role, status
            """,
            (user["id"], invite["id"])
        )
        updated = cur.fetchone()
        db.commit()
        cur.close()

        return {
            "message": f"You have joined '{invite['team_name']}'",
            "member": dict(updated)
        }
    finally:
        db.close()


@router.post("/team-members/invites/{invite_id}/decline")
def decline_invite(invite_id: int, user=Depends(require_user)):
    """
    Decline and delete a team invitation.
    """
    db = get_db()
    try:
        cur = db.cursor()
        user_email = user["email"].strip().lower()

        cur.execute(
            "DELETE FROM team_members WHERE id = %s AND (LOWER(invited_email) = %s OR user_id = %s) AND status = 'pending'",
            (invite_id, user_email, user["id"])
        )
        db.commit()
        cur.close()

        return {"message": "Invite declined"}
    finally:
        db.close()


# =====================================================
# MY PENDING INVITES
# =====================================================

@router.get("/team-members/my-invites")
def get_my_invites(user=Depends(require_user)):
    """
    Returns all pending invitations for the authenticated user.
    """
    db = get_db()
    try:
        cur = db.cursor()
        user_email = user["email"].strip().lower()

        cur.execute(
            """
            SELECT tm.id, tm.team_id, tm.role, tm.invited_at,
                   t.name as team_name, t.image_url, t.color
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE (LOWER(tm.invited_email) = %s OR tm.user_id = %s) AND tm.status = 'pending'
            ORDER BY tm.invited_at DESC
            """,
            (user_email, user["id"])
        )
        invites = cur.fetchall()
        cur.close()

        return {"invites": invites}
    finally:
        db.close()


# =====================================================
# UPDATE MEMBER ROLE
# =====================================================

@router.put("/teams/{team_id}/members/{member_id}")
def update_member_role(
    team_id: int,
    member_id: int,
    data: UpdateMemberRoleSchema,
    user=Depends(require_user)
):
    """
    Change a member's role. Only the team owner can do this.
    Cannot change the owner's role or set role to 'owner'.
    """
    if data.role not in ("editor", "viewer"):
        raise HTTPException(status_code=400, detail="Role must be 'editor' or 'viewer'")

    db = get_db()
    try:
        require_team_role(team_id, user["id"], db, "owner")

        cur = db.cursor()

        # Verify member exists and isn't the owner
        cur.execute(
            "SELECT id, role FROM team_members WHERE id = %s AND team_id = %s",
            (member_id, team_id)
        )
        member = cur.fetchone()

        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        if member["role"] == "owner":
            raise HTTPException(status_code=400, detail="Cannot change the owner's role")

        cur.execute(
            """
            UPDATE team_members
            SET role = %s
            WHERE id = %s
            RETURNING id, team_id, user_id, role, invited_email, status
            """,
            (data.role, member_id)
        )
        updated = cur.fetchone()
        db.commit()
        cur.close()

        return {"member": dict(updated)}
    finally:
        db.close()


# =====================================================
# REMOVE MEMBER
# =====================================================

@router.delete("/teams/{team_id}/members/{member_id}")
def remove_member(team_id: int, member_id: int, user=Depends(require_user)):
    """
    Remove a member from the team. Only the team owner can do this.
    The owner cannot remove themselves.
    """
    db = get_db()
    try:
        require_team_role(team_id, user["id"], db, "owner")

        cur = db.cursor()

        cur.execute(
            "SELECT id, role FROM team_members WHERE id = %s AND team_id = %s",
            (member_id, team_id)
        )
        member = cur.fetchone()

        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        if member["role"] == "owner":
            raise HTTPException(status_code=400, detail="Cannot remove the team owner")

        cur.execute("DELETE FROM team_members WHERE id = %s", (member_id,))
        db.commit()
        cur.close()

        return {"message": "Member removed"}
    finally:
        db.close()
