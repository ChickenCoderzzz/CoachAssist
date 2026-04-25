import os
import psycopg2
from dotenv import load_dotenv

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


def create_tables():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        print("Creating drawboards table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS drawboards (
                id SERIAL PRIMARY KEY,
                team_id    INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
                match_id   INTEGER          REFERENCES matches(id) ON DELETE CASCADE,
                video_id   INTEGER          REFERENCES videos(id)  ON DELETE CASCADE,
                scope      VARCHAR(10) NOT NULL CHECK (scope IN ('playbook','game','video')),
                title      VARCHAR(150) NOT NULL,
                created_by INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                CHECK (
                    (scope = 'playbook' AND match_id IS NULL     AND video_id IS NULL) OR
                    (scope = 'game'     AND match_id IS NOT NULL AND video_id IS NULL) OR
                    (scope = 'video'    AND match_id IS NOT NULL AND video_id IS NOT NULL)
                )
            );
        """)

        print("Creating drawboard_versions table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS drawboard_versions (
                id SERIAL PRIMARY KEY,
                drawboard_id INTEGER NOT NULL REFERENCES drawboards(id) ON DELETE CASCADE,
                author_id    INTEGER NOT NULL REFERENCES users(id),
                snapshot     JSONB NOT NULL,
                summary      TEXT,
                created_at   TIMESTAMP DEFAULT NOW()
            );
        """)

        print("Creating indexes...")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_drawboards_team   ON drawboards(team_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_drawboards_match  ON drawboards(match_id);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_drawboards_video  ON drawboards(video_id);")
        cur.execute(
            "CREATE INDEX IF NOT EXISTS idx_versions_board_at "
            "ON drawboard_versions(drawboard_id, created_at DESC);"
        )

        print("Drawboard tables created successfully (or already exist).")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    create_tables()
