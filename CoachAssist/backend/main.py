from dotenv import load_dotenv
import os

load_dotenv("backend/.env")

from fastapi import FastAPI

from backend.routers.auth import router as auth_router
from backend.routers.team_folders import router as team_folders_router
from backend.routers import players
from backend.routers import auth, videos

app = FastAPI()

# existing routers
app.include_router(auth_router)
app.include_router(team_folders_router)

app.include_router(players.router)

app.include_router(auth.router)
app.include_router(videos.router)

@app.get("/")
def home():
    return {"message": "CoachAssist backend running"}
