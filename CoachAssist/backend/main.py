from dotenv import load_dotenv
import os

load_dotenv("backend/.env") 

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import backend.routers.auth as auth
print("### AUTH MODULE LOADED FROM ###")
print(auth.__file__)

from backend.routers.auth import router as auth_router
from backend.routers.team_folders import router as team_folders_router
from backend.routers.games import router as games_router
from backend.routers.indv_player import router as indv_player_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(team_folders_router)
app.include_router(games_router)
app.include_router(indv_player_router)

@app.get("/")
def home():
    return {"message": "CoachAssist backend running"}
