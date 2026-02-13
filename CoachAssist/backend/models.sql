-- =========================
-- CoachAssist models.sql
-- Football-ready schema
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
