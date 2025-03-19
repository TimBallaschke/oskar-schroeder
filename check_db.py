import sqlite3
import json

DB_PATH = "state_data.db"

def fetch_all_states():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM states")
    rows = cursor.fetchall()
    conn.close()

    for row in rows:
        state_id, content = row
        print("=" * 50)
        print(f"State ID: {state_id}")
        print("Content:", json.loads(content))  # Convert JSON string to dict

fetch_all_states()