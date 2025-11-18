import psycopg2
import os
from dotenv import load_dotenv

#Load .env file
load_dotenv()

#Reading environment variables
host = os.getenv("PGHOST")
database = os.getenv("PGDATABASE")
user = os.getenv("PGUSER")
password = os.getenv("PGPASSWORD")

print(f"Connecting to: {host} {database} {user}")

#Connect to database
connect = psycopg2.connect(
    host = host,
    database = database,
    user = user,
    password = password
)

cursor = connect.cursor()

#Insert test value
cursor.execute("""
    INSERT INTO demo_table (value)
    VALUES ('VSCode demo entry!')
    RETURNING id;       
""")
connect.commit()

#Retrieve rows
cursor.execute("SELECT * FROM demo_table;")
rows = cursor.fetchall()
print(f"Rows in DB: {rows}")

cursor.close()
connect.close()