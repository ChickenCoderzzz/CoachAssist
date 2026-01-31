from dotenv import load_dotenv
import os

load_dotenv("backend/.env") 

from fastapi import FastAPI

import backend.routers.auth as auth
print("### AUTH MODULE LOADED FROM ###")
print(auth.__file__)

from backend.routers.auth import router as auth_router
from backend.routers.team_folders import router as team_folders_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(team_folders_router)

@app.get("/")
def home():
    return {"message": "CoachAssist backend running"}
