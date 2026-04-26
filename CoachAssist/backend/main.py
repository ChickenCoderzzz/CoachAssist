"""
main.py

Entry point for the CoachAssist backend.

Responsibilities:
- Load environment variables
- Initialize FastAPI application
- Register all routers
- Provide base health-check endpoint

This file wires together the entire backend API.
"""

from dotenv import load_dotenv
import os

# Load environment variables from backend/.env file
# Ensures DB credentials, JWT secrets, email configs, etc. are available
load_dotenv("backend/.env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import all route modules
# Each router handles a specific domain of functionality
from backend.routers.auth import router as auth_router 
from backend.routers.team_folders import router as team_folders_router #Added by Wences Jacob Lorenzo
from backend.routers.indv_player import router as indv_player_router #Added by Wences Jacob Lorenzo
from backend.routers.videos import router as videos_router
from backend.routers.player_insights import router as player_insights_router
from backend.routers.games import router as games_router
from backend.routers.player_history import router as player_history #Added by Wences Jacob Lorenzo
from backend.routers.ai import router as ai_router #Added by Wences Jacob Lorenzo
from backend.routers.team_members import router as team_members_router
from backend.routers.game_metrics import router as game_metrics_router
from backend.routers.drawboards import router as drawboards_router



#Initialize FastAPI App
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Register Routers
#Routers define URL prefixes and tags
#Keeps backend organized and scalable

app.include_router(auth_router) # Authentication (signup, login, password reset)
app.include_router(team_folders_router) # Team folder management (Added by Wences Jacob Lorenzo)
app.include_router(indv_player_router) # Individual player management (Added by Wences Jacob Lorenzo)
app.include_router(videos_router) # Game video management
app.include_router(player_insights_router) # Player stats + notes per game
app.include_router(games_router) # Game metadata management
app.include_router(player_history) #Player history management (Added by Wences Jacob Lorenzo)
app.include_router(ai_router)  # AI analysis (Gemini)  (Added by Wences Jacob Lorenzo)
app.include_router(team_members_router)  # Team sharing & member management
app.include_router(game_metrics_router)
app.include_router(drawboards_router) # Football play diagrams + edit history

#Verify if backend is running
@app.get("/")
def home():
    return {"message": "CoachAssist backend running"}
