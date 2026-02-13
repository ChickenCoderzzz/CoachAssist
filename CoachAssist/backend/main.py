from dotenv import load_dotenv
import os

load_dotenv("backend/.env")

from fastapi import FastAPI

from backend.routers.auth import router as auth_router
from backend.routers.team_folders import router as team_folders_router
from backend.routers.indv_player import router as indv_player_router
from backend.routers.videos import router as videos_router
from backend.routers.player_insights import router as player_insights_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(team_folders_router)
app.include_router(indv_player_router)
app.include_router(videos_router)
app.include_router(player_insights_router)

@app.get("/")
def home():
    return {"message": "CoachAssist backend running"}
