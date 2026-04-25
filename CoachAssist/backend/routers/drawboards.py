"""
drawboards.py

Football play diagrams ("drawboards") with snapshot-based edit history.

Three scopes:
- playbook: team-wide reusable diagrams
- game:     boards attached to a specific match
- video:    annotation overlays on a specific video

Every save creates a new immutable row in drawboard_versions tagged with
author_id + timestamp. The "current" state is always the most-recent version.
"""

import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend.database import get_db
from backend.routers.auth import require_user
from backend.routers.team_access import require_team_role


router = APIRouter(tags=["Drawboards"])


# ---------- Schemas ----------

class CreateDrawboardBody(BaseModel):
    scope: str = Field(..., pattern="^(playbook|game|video)$")
    title: str
    match_id: Optional[int] = None
    video_id: Optional[int] = None
    snapshot: Any
    summary: Optional[str] = None


class SaveVersionBody(BaseModel):
    snapshot: Any
    summary: Optional[str] = None


# ---------- Helpers ----------

def _load_board(board_id: int, db) -> dict:
    cur = db.cursor()
    cur.execute(
        """
        SELECT id, team_id, match_id, video_id, scope, title,
               created_by, created_at, updated_at
        FROM drawboards
        WHERE id = %s
        """,
        (board_id,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Drawboard not found")
    return row


def _latest_version(board_id: int, db) -> Optional[dict]:
    cur = db.cursor()
    cur.execute(
        """
        SELECT v.id, v.author_id, v.snapshot, v.summary, v.created_at,
               u.username AS author_username
        FROM drawboard_versions v
        JOIN users u ON u.id = v.author_id
        WHERE v.drawboard_id = %s
        ORDER BY v.created_at DESC, v.id DESC
        LIMIT 1
        """,
        (board_id,),
    )
    row = cur.fetchone()
    cur.close()
    return row


def _verify_video_belongs_to_match(video_id: int, match_id: int, db):
    cur = db.cursor()
    cur.execute(
        "SELECT id FROM videos WHERE id = %s AND match_id = %s",
        (video_id, match_id),
    )
    found = cur.fetchone()
    cur.close()
    if not found:
        raise HTTPException(status_code=404, detail="Video not found for this match")


# ---------- List / create boards on a team ----------

@router.get("/teams/{team_id}/drawboards")
def list_drawboards(
    team_id: int,
    scope: str = Query(..., pattern="^(playbook|game|video)$"),
    match_id: Optional[int] = None,
    video_id: Optional[int] = None,
    db=Depends(get_db),
    user=Depends(require_user),
):
    require_team_role(team_id, user["id"], db, "viewer")

    sql = """
        SELECT d.id, d.team_id, d.match_id, d.video_id, d.scope, d.title,
               d.created_by, u.username AS created_by_username,
               d.created_at, d.updated_at
        FROM drawboards d
        JOIN users u ON u.id = d.created_by
        WHERE d.team_id = %s AND d.scope = %s
    """
    params: list = [team_id, scope]

    if scope == "game":
        if match_id is None:
            raise HTTPException(status_code=400, detail="match_id required for scope='game'")
        sql += " AND d.match_id = %s AND d.video_id IS NULL"
        params.append(match_id)
    elif scope == "video":
        if match_id is None or video_id is None:
            raise HTTPException(
                status_code=400,
                detail="match_id and video_id required for scope='video'",
            )
        sql += " AND d.match_id = %s AND d.video_id = %s"
        params.extend([match_id, video_id])
    else:  # playbook
        sql += " AND d.match_id IS NULL AND d.video_id IS NULL"

    sql += " ORDER BY d.updated_at DESC"

    cur = db.cursor()
    cur.execute(sql, tuple(params))
    rows = cur.fetchall()
    cur.close()
    return {"drawboards": rows}


@router.post("/teams/{team_id}/drawboards")
def create_drawboard(
    team_id: int,
    body: CreateDrawboardBody,
    db=Depends(get_db),
    user=Depends(require_user),
):
    require_team_role(team_id, user["id"], db, "editor")

    # Per-scope validation matching the table's CHECK constraint.
    if body.scope == "playbook":
        if body.match_id is not None or body.video_id is not None:
            raise HTTPException(status_code=400, detail="playbook scope cannot have match_id/video_id")
    elif body.scope == "game":
        if body.match_id is None or body.video_id is not None:
            raise HTTPException(status_code=400, detail="game scope requires match_id and no video_id")
    elif body.scope == "video":
        if body.match_id is None or body.video_id is None:
            raise HTTPException(status_code=400, detail="video scope requires both match_id and video_id")
        _verify_video_belongs_to_match(body.video_id, body.match_id, db)

    # Match must belong to this team.
    if body.match_id is not None:
        cur = db.cursor()
        cur.execute(
            "SELECT id FROM matches WHERE id = %s AND team_id = %s",
            (body.match_id, team_id),
        )
        if not cur.fetchone():
            cur.close()
            raise HTTPException(status_code=404, detail="Match not found for this team")
        cur.close()

    cur = db.cursor()
    try:
        cur.execute(
            """
            INSERT INTO drawboards (team_id, match_id, video_id, scope, title, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, team_id, match_id, video_id, scope, title,
                      created_by, created_at, updated_at
            """,
            (team_id, body.match_id, body.video_id, body.scope, body.title, user["id"]),
        )
        board = cur.fetchone()

        cur.execute(
            """
            INSERT INTO drawboard_versions (drawboard_id, author_id, snapshot, summary)
            VALUES (%s, %s, %s::jsonb, %s)
            RETURNING id, author_id, snapshot, summary, created_at
            """,
            (board["id"], user["id"], json.dumps(body.snapshot), body.summary),
        )
        version = cur.fetchone()
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()

    return {"drawboard": board, "latest_version": version}


# ---------- Single board ----------

@router.get("/drawboards/{board_id}")
def get_drawboard(
    board_id: int,
    db=Depends(get_db),
    user=Depends(require_user),
):
    board = _load_board(board_id, db)
    require_team_role(board["team_id"], user["id"], db, "viewer")
    latest = _latest_version(board_id, db)
    return {"drawboard": board, "latest_version": latest}


@router.delete("/drawboards/{board_id}")
def delete_drawboard(
    board_id: int,
    db=Depends(get_db),
    user=Depends(require_user),
):
    board = _load_board(board_id, db)
    require_team_role(board["team_id"], user["id"], db, "editor")

    cur = db.cursor()
    cur.execute("DELETE FROM drawboards WHERE id = %s", (board_id,))
    db.commit()
    cur.close()
    return {"message": "Drawboard deleted"}


# ---------- Versions ----------

@router.get("/drawboards/{board_id}/versions")
def list_versions(
    board_id: int,
    db=Depends(get_db),
    user=Depends(require_user),
):
    board = _load_board(board_id, db)
    require_team_role(board["team_id"], user["id"], db, "viewer")

    cur = db.cursor()
    cur.execute(
        """
        SELECT v.id, v.author_id, v.summary, v.created_at,
               u.username AS author_username, u.email AS author_email
        FROM drawboard_versions v
        JOIN users u ON u.id = v.author_id
        WHERE v.drawboard_id = %s
        ORDER BY v.created_at DESC, v.id DESC
        """,
        (board_id,),
    )
    rows = cur.fetchall()
    cur.close()
    return {"versions": rows}


@router.get("/drawboards/{board_id}/versions/{version_id}")
def get_version(
    board_id: int,
    version_id: int,
    db=Depends(get_db),
    user=Depends(require_user),
):
    board = _load_board(board_id, db)
    require_team_role(board["team_id"], user["id"], db, "viewer")

    cur = db.cursor()
    cur.execute(
        """
        SELECT v.id, v.author_id, v.snapshot, v.summary, v.created_at,
               u.username AS author_username
        FROM drawboard_versions v
        JOIN users u ON u.id = v.author_id
        WHERE v.id = %s AND v.drawboard_id = %s
        """,
        (version_id, board_id),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"version": row}


@router.post("/drawboards/{board_id}/versions")
def save_version(
    board_id: int,
    body: SaveVersionBody,
    db=Depends(get_db),
    user=Depends(require_user),
):
    board = _load_board(board_id, db)
    require_team_role(board["team_id"], user["id"], db, "editor")

    cur = db.cursor()
    try:
        cur.execute(
            """
            INSERT INTO drawboard_versions (drawboard_id, author_id, snapshot, summary)
            VALUES (%s, %s, %s::jsonb, %s)
            RETURNING id, author_id, snapshot, summary, created_at
            """,
            (board_id, user["id"], json.dumps(body.snapshot), body.summary),
        )
        version = cur.fetchone()
        cur.execute(
            "UPDATE drawboards SET updated_at = NOW() WHERE id = %s",
            (board_id,),
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
    return {"version": version}


@router.post("/drawboards/{board_id}/versions/{version_id}/restore")
def restore_version(
    board_id: int,
    version_id: int,
    db=Depends(get_db),
    user=Depends(require_user),
):
    board = _load_board(board_id, db)
    require_team_role(board["team_id"], user["id"], db, "editor")

    cur = db.cursor()
    cur.execute(
        "SELECT snapshot FROM drawboard_versions WHERE id = %s AND drawboard_id = %s",
        (version_id, board_id),
    )
    src = cur.fetchone()
    if not src:
        cur.close()
        raise HTTPException(status_code=404, detail="Version not found")

    try:
        cur.execute(
            """
            INSERT INTO drawboard_versions (drawboard_id, author_id, snapshot, summary)
            VALUES (%s, %s, %s::jsonb, %s)
            RETURNING id, author_id, snapshot, summary, created_at
            """,
            (board_id, user["id"], json.dumps(src["snapshot"]), f"Restored from version {version_id}"),
        )
        version = cur.fetchone()
        cur.execute("UPDATE drawboards SET updated_at = NOW() WHERE id = %s", (board_id,))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
    return {"version": version}
