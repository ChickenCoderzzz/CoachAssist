-- =========================
-- CoachAssist models.sql
-- Football-ready schema
-- =========================

-- =========================
-- USERS TABLES
-- =========================

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

--START OF SQL by Wences Jacob Lorenzo
-- Add email verification to USERS table 
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verification_code VARCHAR(6),
ADD COLUMN email_verification_expires TIMESTAMP;

-- Add password reset columns to USERS table
ALTER TABLE users
ADD COLUMN password_reset_code TEXT,
ADD COLUMN password_reset_expires TIMESTAMP;

-- PENDING USERS
CREATE TABLE pending_users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    verification_expires TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- TEAMS TABLES
-- =========================

-- TEAMS
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add cascade delete to TEAMS table
ALTER TABLE teams
ADD CONSTRAINT teams_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- =========================
-- MATCHES (Games) TABLES
-- =========================

-- MATCHES
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add opponents and game details to MATCHES table
ALTER TABLE matches
ADD COLUMN opponent VARCHAR(150) NOT NULL,
ADD COLUMN game_date DATE NOT NULL,
ADD COLUMN team_score INTEGER,
ADD COLUMN opponent_score INTEGER;

-- =========================
-- INDV_PLAYERS TABLES
-- =========================

-- INDV_PLAYERS
CREATE TABLE indv_players (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    jersey_number INTEGER NOT NULL,
    position VARCHAR(20) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add player priority to INDV_PLAYERS table
ALTER TABLE indv_players
ADD COLUMN is_priority BOOLEAN NOT NULL DEFAULT FALSE;

-- =========================
-- SAVED_PLAYER_ANALYSIS TABLE
-- =========================

-- SAVED_PLAYER_ANALYSIS
CREATE TABLE saved_player_analysis (
  id SERIAL PRIMARY KEY,
  player_id INT,
  player_name TEXT,
  position TEXT,
  jersey_number INT,
  analysis_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add team_id to SAVED_PLAYER_ANALYSIS table
ALTER TABLE saved_player_analysis
ADD COLUMN team_id INTEGER;

-- SAVED_GAME_ANALYSIS
CREATE TABLE saved_game_analysis (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  game_id INTEGER,
  game_name TEXT,
  opponent TEXT,
  game_date DATE,
  analysis_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--END OF SQL by Wences Jacob Lorenzo

-- =========================
-- PLAYER INSIGHTS TABLES
-- =========================

-- PLAYER_STATS
CREATE TABLE player_stats (
    id SERIAL PRIMARY KEY,

    -- Link to roster player
    player_id INTEGER NOT NULL
        REFERENCES indv_players(id)
        ON DELETE CASCADE,

    -- =====================
    -- UNIVERSAL (All Players)
    -- =====================

    games_played INTEGER DEFAULT 0,
    snaps_played INTEGER DEFAULT 0,
    penalties INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    touchdowns INTEGER DEFAULT 0,

    -- =====================
    -- OFFENSE
    -- =====================

    -- Passing (QB)
    pass_attempts INTEGER DEFAULT 0,
    pass_completions INTEGER DEFAULT 0,
    passing_yards INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    interceptions_thrown INTEGER DEFAULT 0,

    -- Rushing
    rush_attempts INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,

    -- Receiving
    receptions INTEGER DEFAULT 0,
    receiving_yards INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,

    -- Offensive Line
    sacks_allowed INTEGER DEFAULT 0,

    -- =====================
    -- DEFENSE
    -- =====================

    tackles INTEGER DEFAULT 0,
    sacks INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    forced_fumbles INTEGER DEFAULT 0,
    fumbles_recovered INTEGER DEFAULT 0,
    passes_defended INTEGER DEFAULT 0,

    -- =====================
    -- SPECIAL TEAMS
    -- =====================

    field_goals_made INTEGER DEFAULT 0,
    field_goals_attempted INTEGER DEFAULT 0,
    extra_points_made INTEGER DEFAULT 0,

    punts INTEGER DEFAULT 0,
    punt_yards INTEGER DEFAULT 0,

    kick_returns INTEGER DEFAULT 0,
    kick_return_yards INTEGER DEFAULT 0,
    kick_return_tds INTEGER DEFAULT 0,

    punt_returns INTEGER DEFAULT 0,
    punt_return_yards INTEGER DEFAULT 0,
    punt_return_tds INTEGER DEFAULT 0,

    -- General
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add game_id to PLAYER_STATS table
ALTER TABLE player_stats
ADD COLUMN game_id INTEGER NOT NULL
REFERENCES matches(id)
ON DELETE CASCADE;

-- PLAYER_NOTES
--Section by Wences Jacob Lorenzo
CREATE TABLE player_notes (
    id SERIAL PRIMARY KEY,

    player_id INTEGER NOT NULL
        REFERENCES indv_players(id)
        ON DELETE CASCADE,

    game_id INTEGER NOT NULL
        REFERENCES matches(id)
        ON DELETE CASCADE,

    category VARCHAR(50) DEFAULT 'General',
    note TEXT NOT NULL,
    time VARCHAR(20),

    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- TEAM MEMBERS (Sharing)
-- =========================

CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL DEFAULT 'viewer'
        CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_email VARCHAR(100) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted')),
    invite_code VARCHAR(6),
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    UNIQUE(team_id, invited_email)
);

-- ======================================================================
-- TABLE UPDATES FOR ANALYSIS ENHANCEMENT FEATURES - Wences Jacob Lorenzo
-- ======================================================================

--Add game quarter to game state table
ALTER TABLE game_states ADD COLUMN quarter VARCHAR(2);

--Add game quarter to player notes
ALTER TABLE player_notes ADD COLUMN quarter VARCHAR(2);

--Add quarter column to player stats
ALTER TABLE player_stats
ADD COLUMN quarter VARCHAR(10) DEFAULT 'overall';

--Add unique constraint for player game quarter
ALTER TABLE player_stats
ADD CONSTRAINT unique_player_game_quarter
UNIQUE (player_id, game_id, quarter);

--Remove duplicate player stat records
DELETE FROM player_stats a
USING player_stats b
WHERE a.id > b.id
AND a.player_id = b.player_id
AND a.game_id = b.game_id
AND a.quarter = b.quarter;

--Add missing columns to player stats
ALTER TABLE player_stats
ADD COLUMN targets INTEGER DEFAULT 0,
ADD COLUMN drops INTEGER DEFAULT 0,
ADD COLUMN run_block_snaps INTEGER DEFAULT 0,
ADD COLUMN pass_block_snaps INTEGER DEFAULT 0,
ADD COLUMN lead_blocks INTEGER DEFAULT 0,
ADD COLUMN tackles_for_loss INTEGER DEFAULT 0,
ADD COLUMN punts_inside_20 INTEGER DEFAULT 0,
ADD COLUMN bad_snaps INTEGER DEFAULT 0,
ADD COLUMN targets_allowed INTEGER DEFAULT 0,
ADD COLUMN completions_allowed INTEGER DEFAULT 0,
ADD COLUMN total_snaps INTEGER DEFAULT 0;

-- CREATE GAME METRICS TABLE
CREATE TABLE game_metrics (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL,
    quarter VARCHAR(10) NOT NULL,

    -- Core Coaching Metrics
    points INTEGER DEFAULT 0,
    total_yards INTEGER DEFAULT 0,
    turnovers INTEGER DEFAULT 0,
    penalties INTEGER DEFAULT 0,
    penalty_yards INTEGER DEFAULT 0,
    third_down_conversions INTEGER DEFAULT 0,
    third_down_attempts INTEGER DEFAULT 0,
    time_of_possession INTEGER DEFAULT 0, -- seconds

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(game_id, quarter)
);

--Add opponent stat columns to game metrics
ALTER TABLE game_metrics
ADD COLUMN opp_points INTEGER DEFAULT 0,
ADD COLUMN opp_total_yards INTEGER DEFAULT 0,
ADD COLUMN opp_turnovers INTEGER DEFAULT 0,
ADD COLUMN opp_penalties INTEGER DEFAULT 0,
ADD COLUMN opp_penalty_yards INTEGER DEFAULT 0,
ADD COLUMN opp_third_down_conversions INTEGER DEFAULT 0,
ADD COLUMN opp_third_down_attempts INTEGER DEFAULT 0,
ADD COLUMN opp_time_of_possession INTEGER DEFAULT 0;

--Add athlete_id to indv_players table
ALTER TABLE indv_players
ADD COLUMN athlete_id INT;

--Set athlete_id to match player id
UPDATE indv_players
SET athlete_id = id;

--Add unique constraint for player position
ALTER TABLE indv_players
ADD CONSTRAINT unique_player_position
UNIQUE (athlete_id, position);

--Add is_active column to indv_players table
ALTER TABLE indv_players
ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(invited_email);

-- PLAYERS (Football)
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,

    coach_username VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    jersey_number INT,

    -- Dropdown-friendly fields
    unit VARCHAR(20),
    position VARCHAR(20),

    -- Basic football stats (MVP)
    touchdowns INT DEFAULT 0,
    yards INT DEFAULT 0,
    tackles INT DEFAULT 0,
    interceptions INT DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT players_unit_check
      CHECK (unit IS NULL OR unit IN ('offense', 'defense', 'special_teams')),

    -- Keep this list MVP-simple. You can expand later without changing the UI pattern.
    CONSTRAINT players_position_check
      CHECK (position IS NULL OR position IN (
        -- Offense
        'QB','RB','WR','TE','OL',
        -- Defense
        'DL','LB','CB','S',
        -- Special Teams
        'K','P','LS','KR','PR'
      )),

    FOREIGN KEY (coach_username) REFERENCES users(username) ON DELETE CASCADE
);

-- Helpful index for your GET /players query
CREATE INDEX IF NOT EXISTS idx_players_coach_username
ON players(coach_username);

-- =========================
-- SAFE MIGRATION (run if your players table already exists with basketball columns)
-- This will:
--   - add unit + interceptions
--   - rename points->touchdowns, assists->yards, rebounds->tackles
-- =========================

-- 1) Add new columns (safe if they already exist)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20);

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS interceptions INT DEFAULT 0;

-- 2) Rename old basketball columns to football equivalents (safe-ish)
-- If a column doesn't exist, this will error; run only if you still have these columns.
ALTER TABLE players RENAME COLUMN points TO touchdowns;
ALTER TABLE players RENAME COLUMN assists TO yards;
ALTER TABLE players RENAME COLUMN rebounds TO tackles;

-- 3) Add/refresh constraints (drop first to avoid duplicate name errors)
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_unit_check;
ALTER TABLE players ADD CONSTRAINT players_unit_check
  CHECK (unit IS NULL OR unit IN ('offense', 'defense', 'special_teams'));

ALTER TABLE players DROP CONSTRAINT IF EXISTS players_position_check;
ALTER TABLE players ADD CONSTRAINT players_position_check
  CHECK (position IS NULL OR position IN (
    'QB','RB','WR','TE','OL',
    'DL','LB','CB','S',
    'K','P','LS','KR','PR'
  ));
