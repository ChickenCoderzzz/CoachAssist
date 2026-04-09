
from fastapi import APIRouter, HTTPException, Depends, status
from backend.database import get_db
from backend.routers.auth import require_user
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(
    prefix="/games",
    tags=["Games"]
)

class GameStateRow(BaseModel):
    id: Optional[int]
    text: str
    time: str
    quarter: Optional[str] = None #Added by Wences Jacob Lorenzo

class GameStateUpdate(BaseModel):
    category: str
    data: List[GameStateRow]

def verify_game_access(game_id: int, user_id: int, db):
    cur = db.cursor()
    cur.execute("""
        SELECT m.id
        FROM matches m
        JOIN teams t ON m.team_id = t.id
        WHERE m.id = %s AND t.user_id = %s
    """, (game_id, user_id))
    
    match = cur.fetchone()
    cur.close()
    
    if not match:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied to this game"
        )


@router.get("/{game_id}/state")
def get_game_state(
    game_id: int, 
    db=Depends(get_db), 
    user=Depends(require_user)
):
    verify_game_access(game_id, user["id"], db)
    cur = db.cursor()
    
    cur.execute("""
        SELECT id, category, observation as text, time, quarter
        FROM game_states 
        WHERE game_id = %s
    """, (game_id,))
    
    rows = cur.fetchall()
    
    # Transform flat list into nested dictionary structure expected by frontend
    result = {
        "Game State": [],
        "Offensive": [],
        "Defensive": [],
        "Special": []
    }
    
    for row in rows:
        category = row["category"]
        if category in result:
            result[category].append({
                "id": row["id"],
                "text": row["text"],
                "time": row["time"],
                "quarter": row["quarter"] #Added by Wences Jacob Lorenzo
            })
            
    return result

@router.put("/{game_id}/state")
def update_game_state(
    game_id: int, 
    state_data: dict[str, List[GameStateRow]], 
    db=Depends(get_db), 
    user=Depends(require_user)
):
    verify_game_access(game_id, user["id"], db)
    cur = db.cursor()
    
    try:
        
        cur.execute("DELETE FROM game_states WHERE game_id = %s", (game_id,))
        
        #Edited by Wences Jacob Lorenzo
        insert_query = """ 
            INSERT INTO game_states (game_id, category, observation, time, quarter)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        for category, rows in state_data.items():
            for row in rows:
                cur.execute(insert_query, (game_id, category, row.text, row.time, row.quarter)) #Wences Jacob Lorenzo
        
        db.commit()
        return {"message": "Game state updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
