
import os
import psycopg2
from dotenv import load_dotenv

# Load env from backend/.env or just .env depending on where we run it
# Try loading from backend/.env if it exists
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
        
        print("Creating game_states table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS game_states (
                id SERIAL PRIMARY KEY,
                game_id INTEGER NOT NULL,
                category VARCHAR(50) NOT NULL,
                observation TEXT,
                time VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        print("Table game_states created successfully (or already exists).")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_table()
