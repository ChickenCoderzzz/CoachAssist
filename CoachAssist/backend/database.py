import psycopg2
import os
from dotenv import load_dotenv

#Load environment variables from .env
load_dotenv()

def get_db():
    #Opens connection to database. Requests that query DB calls this.
    conn = psycopg2.connect(
        host=os.getenv("PGHOST"),
        database=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD")
    )

    return conn