from dotenv import load_dotenv
import os

load_dotenv("backend/.env")

from fastapi import FastAPI

from backend.routers.auth import router as auth_router
from backend.routers.team_folders import router as team_folders_router
<<<<<<< HEAD
from backend.routers.games import router as games_router
from backend.routers.indv_player import router as indv_player_router
=======
from backend.routers import players
from backend.routers import auth, videos
>>>>>>> origin/feature/players-table

app = FastAPI()

# existing routers
app.include_router(auth_router)
app.include_router(team_folders_router)
<<<<<<< HEAD
app.include_router(games_router)
app.include_router(indv_player_router)
=======

app.include_router(players.router)

app.include_router(auth.router)
app.include_router(videos.router)
>>>>>>> origin/feature/players-table

@app.get("/")
def home():
    return {"message": "CoachAssist backend running"}
