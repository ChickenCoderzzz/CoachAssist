CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    coach_username VARCHAR(50) NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    jersey_number INT,
    position VARCHAR(20),
    points INT DEFAULT 0,
    assists INT DEFAULT 0,
    rebounds INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (coach_username) REFERENCES users(username) ON DELETE CASCADE
);