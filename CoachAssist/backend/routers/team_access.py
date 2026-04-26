"""
team_access.py

Centralized access control for team resources.

Provides helpers to check if a user has the required role
(owner, editor, viewer) for a given team or game.
"""

from fastapi import HTTPException

ROLE_HIERARCHY = {"owner": 3, "editor": 2, "viewer": 1}


def get_user_team_role(team_id: int, user_id: int, db):
    """
    Returns the user's role for a team, or None if no access.

    Checks:
    1. Is user the team owner (teams.user_id)?  -> 'owner'
    2. Is user an accepted team member?          -> role from team_members
    """
    cur = db.cursor()

    cur.execute(
        "SELECT id FROM teams WHERE id = %s AND user_id = %s",
        (team_id, user_id)
    )
    if cur.fetchone():
        cur.close()
        return "owner"

    cur.execute(
        """
        SELECT role FROM team_members
        WHERE team_id = %s AND user_id = %s AND status = 'accepted'
        """,
        (team_id, user_id)
    )
    row = cur.fetchone()
    cur.close()

    if row:
        return row["role"]

    return None


def require_team_role(team_id: int, user_id: int, db, required_role: str = "viewer"):
    """
    Checks that the user has at least the required role for the team.
    Returns the actual role string.
    Raises HTTPException(403) if insufficient access.
    """
    role = get_user_team_role(team_id, user_id, db)

    if not role:
        raise HTTPException(status_code=403, detail="You do not have access to this team")

    if ROLE_HIERARCHY.get(role, 0) < ROLE_HIERARCHY.get(required_role, 0):
        raise HTTPException(status_code=403, detail=f"Requires {required_role} access")

    return role


def require_game_role(game_id: int, user_id: int, db, required_role: str = "viewer"):
    """
    Looks up team_id from a game (match), then checks team role.
    Returns the actual role string.
    """
    cur = db.cursor()
    cur.execute("SELECT team_id FROM matches WHERE id = %s", (game_id,))
    match = cur.fetchone()
    cur.close()

    if not match:
        raise HTTPException(status_code=404, detail="Game not found")

    return require_team_role(match["team_id"], user_id, db, required_role)
