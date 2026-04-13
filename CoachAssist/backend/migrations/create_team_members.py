
import os
import psycopg2
from dotenv import load_dotenv

# Load env from backend/.env if it exists
if os.path.exists("backend/.env"):
    load_dotenv("backend/.env")
else:
    load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        conn = psycopg2.connect(database_url)
    else:
        conn = psycopg2.connect(
             host=os.getenv("PGHOST"),
             database=os.getenv("PGDATABASE"),
             user=os.getenv("PGUSER"),
             password=os.getenv("PGPASSWORD"),
             sslmode="require" if os.getenv("PGHOST") else "disable"
        )
    conn.autocommit = True
    return conn

def create_table():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("Creating team_members table...")
        cur.execute("""
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
        """)

        cur.execute("CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(invited_email);")

        # Backfill: create owner membership rows for existing teams
        print("Backfilling owner rows for existing teams...")
        cur.execute("""
            INSERT INTO team_members (team_id, user_id, role, invited_email, status, accepted_at)
            SELECT t.id, t.user_id, 'owner', u.email, 'accepted', NOW()
            FROM teams t
            JOIN users u ON t.user_id = u.id
            WHERE NOT EXISTS (
                SELECT 1 FROM team_members tm
                WHERE tm.team_id = t.id AND tm.role = 'owner'
            );
        """)

        print("Table team_members created successfully (or already exists).")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_table()
