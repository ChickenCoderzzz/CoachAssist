import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_db():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        conn = psycopg2.connect(database_url)
    else:
        conn = psycopg2.connect(
            host=os.getenv("PGHOST"),
            database=os.getenv("PGDATABASE"),
            user=os.getenv("PGUSER"),
            password=os.getenv("PGPASSWORD"),
            sslmode="require"
        )

    return conn
