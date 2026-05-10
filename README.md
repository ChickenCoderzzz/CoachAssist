# CoachAssist

CoachAssist is a football analytics and game analysis platform designed to help coaches and analysts manage teams, review game footage, track player performance, and generate data-driven insights through interactive visualizations and AI-assisted tools.

The system combines:
- Team and roster management
- Game and player analytics
- Video upload and playback
- AI-powered video upscaling
- Drawboard/play design functionality
- Firebase authentication and cloud storage
- Statistical visualizations and filtering tools

CoachAssist was developed as a capstone project focused on improving football analysis workflows through centralized analytics and integrated tooling.

---

# Features

## Team Management
- Create and manage football teams
- Add and manage team members
- Team access control functionality
- Team folder organization

## Player Management
- Create and edit player profiles
- Track player statistics
- Store player insights and history
- Position and unit-based player organization

## Game Analysis
- Track offensive, defensive, and special teams statistics
- Store game metrics and game state data
- Filter statistics by:
  - Quarter
  - Drive
  - Down
  - Unit
  - Player
  - Game

## Data Visualization
- Radar charts
- Bar charts
- Progress graphs
- Quarterly analysis charts
- Statistical trend visualizations

## Video Features
- Upload and manage game footage
- Firebase cloud video storage
- YouTube video support
- AI video upscaling using Real-ESRGAN
- FFmpeg-based video processing

## AI Features
- Google Gemini API integration
- AI-assisted football analysis functionality

## Drawboards
- Drawboard/play design support for football strategy visualization

---

# Tech Stack

## Frontend
- React
- Vite
- JavaScript
- CSS

Frontend source:

```plaintext
frontend/vite-project/
```

---

## Backend
- FastAPI
- Python
- PostgreSQL

Backend source:

```plaintext
backend/
```

---

## Cloud / External Services
- Firebase Authentication
- Firebase Storage
- Google Gemini API

---

## AI / Video Processing
- Real-ESRGAN
- FFmpeg

---

# Project Structure

```plaintext
CoachAssist/
│
├── backend/
│   ├── routers/                 # FastAPI route handlers
│   ├── schemas/                 # Pydantic schemas
│   ├── migrations/              # Database migration scripts
│   ├── uploads/                 # Uploaded team files/videos
│   ├── upscaling_utils/         # AI upscaling utilities
│   ├── video_providers/         # Firebase/YouTube integrations
│   ├── main.py                  # FastAPI application entry
│   ├── database.py              # Database configuration
│   ├── requirements.txt         # Python dependencies
│   ├── realesrgan-linux.zip
│   ├── realesrgan-windows.zip
│   ├── firebase_key.json        # Firebase credentials (not included)
│   ├── .env                     # Environment variables (not included)
│   └── Dockerfile
│
├── frontend/
│   └── vite-project/
│       ├── src/
│       ├── public/
│       ├── package.json
│       ├── vite.config.js
│       └── Dockerfile
│
├── docker-compose.yml
└── README.md
```

---

# Prerequisites

Install the following before running the project:

- Python 3.10+
- Node.js
- npm
- PostgreSQL
- Git
- FFmpeg

---

# Repository Setup

## 1. Clone the Repository

```bash
git clone <repository-url>
cd CoachAssist
```

---

# Backend Setup

## 2. Navigate to Backend

```bash
cd backend
```

---

## 3. Create a Virtual Environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 4. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

# PostgreSQL Setup

## 5. Create PostgreSQL Database

Create a PostgreSQL database for CoachAssist.

Example:

```sql
CREATE DATABASE coachassist;
```

---

## 6. Configure Environment Variables

Create a `.env` file inside the backend directory.

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/coachassist

SECRET_KEY=your_secret_key

GEMINI_API_KEY=your_gemini_api_key

FIREBASE_KEY_PATH=backend/firebase_key.json
```

> Note:
> - The `.env` file is intentionally excluded from the repository for security reasons.
> - Contact the project developers if you need the required `.env` configuration values.

---

# Firebase Setup

## 7. Configure Firebase

CoachAssist uses Firebase Authentication and Firebase Storage.

### Steps

1. Create a Firebase project
2. Enable Authentication
3. Enable Cloud Storage
4. Generate a Firebase Admin SDK key
5. Download the JSON service account file

Place the Firebase service account file inside the backend directory.

Example:

```plaintext
backend/firebase_key.json
```

> Note:
> - `firebase_key.json` is intentionally excluded from the repository for security reasons.
> - Contact the project developers if you need access to the Firebase credentials file.

---

# Gemini API Setup

## 8. Configure Gemini API

CoachAssist integrates the Google Gemini API for AI-assisted functionality.

### Steps

1. Create a Google AI Studio account
2. Generate a Gemini API key
3. Add the API key to the `.env` file

Example:

```env
GEMINI_API_KEY=your_api_key_here
```

---

# FFmpeg Setup

## 9. Install FFmpeg

FFmpeg is required for video processing and AI upscaling.

---

## Windows

### Download FFmpeg

Download FFmpeg from the official website.

### Extract FFmpeg

Extract the ZIP file.

### Add FFmpeg to PATH

Add the FFmpeg `bin` folder to your system PATH.

Example:

```plaintext
C:\ffmpeg\bin
```

### Verify Installation

```bash
ffmpeg -version
```

---

## Linux

```bash
sudo apt install ffmpeg
```

---

## macOS

```bash
brew install ffmpeg
```

---

# Real-ESRGAN Setup

## 10. Setup AI Upscaler

Inside the backend directory are operating-system-specific Real-ESRGAN packages:

```plaintext
backend/realesrgan-linux.zip
backend/realesrgan-windows.zip
```

Extract the ZIP file matching your operating system.

Windows users may also use:

```plaintext
backend/realesrgan-ncnn-vulkan-windows/
```

Keep the extracted Real-ESRGAN files inside the backend directory unless the backend configuration is modified.

---

# Frontend Setup

## 11. Navigate to Frontend

Open a new terminal and move into the frontend project directory:

```bash
cd frontend/vite-project
```

---

## 12. Install Frontend Dependencies

```bash
npm install
```

---

# Running the Application

## 13. Start the Backend Server

From the backend directory:

```bash
uvicorn main:app --reload
```

Backend server:

```plaintext
http://localhost:8000
```

---

## 14. Start the Frontend Development Server

From the frontend/vite-project directory:

```bash
npm run dev
```

Frontend server:

```plaintext
http://localhost:5173
```

---

# Docker Support

CoachAssist includes Docker configuration files.

Available files:

```plaintext
backend/Dockerfile
frontend/vite-project/Dockerfile
docker-compose.yml
```

Example Docker command:

```bash
docker-compose up --build
```

---

# Backend API Routers

The backend includes the following FastAPI routers:

```plaintext
backend/routers/
```

Implemented routers include:

- ai.py
- auth.py
- drawboards.py
- game_metrics.py
- games.py
- indv_player.py
- player_history.py
- player_insights.py
- players.py
- team_access.py
- team_folders.py
- team_members.py
- videos.py

---

# Usage Overview

## Authentication
- Register or log into an account
- Firebase Authentication manages user sessions

## Team Management
- Create teams
- Manage team folders
- Add team members

## Player Management
- Add and edit players
- Track player statistics and insights

## Game Analysis
- Create and manage games
- Input football statistics
- Filter analytics and visualizations

## Video Management
- Upload videos
- Review footage
- Process videos with AI upscaling

## Visual Analytics
Generate:
- Radar charts
- Statistical trend graphs
- Quarterly analysis charts
- Comparative performance visualizations

---

# Important Notes

- Firebase credentials are not included in the repository.
- The `.env` file is not included in the repository.
- Contact the developers if you require the necessary configuration files.
- FFmpeg is required for video processing functionality.
- Real-ESRGAN is required for AI upscaling functionality.
- Some screenshots or demo data used during development may contain placeholder or test data.

---

# Contributors

CoachAssist Development Team

---

# License

This project was developed for educational and academic purposes.
