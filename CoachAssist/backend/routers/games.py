
from fastapi import APIRouter, HTTPException
from backend.database import get_db
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

class GameStateUpdate(BaseModel):
    category: str
    data: List[GameStateRow]

@router.get("/{game_id}/state")
def get_game_state(game_id: int):
    db = get_db()
    cur = db.cursor()
    
    cur.execute("""
        SELECT id, category, observation as text, time 
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
                "time": row["time"]
            })
            
    # If empty, return empty structure (frontend handles initial state? Actually frontend expects rows to edit)
    # If the DB is empty, the frontend might render empty tables. 
    # For now, let's return what we have.
    
    return result

@router.put("/{game_id}/state")
def update_game_state(game_id: int, state_data: dict[str, List[GameStateRow]]):
    db = get_db()
    cur = db.cursor()
    
    try:
        # We will replace all entries for this game_id with the new data
        # This is a simple approach: Delete all for game_id and re-insert.
        # A more optimized approach would be diffing, but for this size of data, replace is fine.
        
        cur.execute("DELETE FROM game_states WHERE game_id = %s", (game_id,))
        
        insert_query = """
            INSERT INTO game_states (game_id, category, observation, time)
            VALUES (%s, %s, %s, %s)
        """
        
        for category, rows in state_data.items():
            for row in rows:
                cur.execute(insert_query, (game_id, category, row.text, row.time))
        
        db.commit()
        return {"message": "Game state updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
