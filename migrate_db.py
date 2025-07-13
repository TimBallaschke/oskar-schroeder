import sqlite3
import os

DB_PATH = "state_data.db"

def migrate_database():
    """Add created_at column to existing states table"""
    try:
        # Check if database exists
        if not os.path.exists(DB_PATH):
            print("Database does not exist. No migration needed.")
            return True

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if created_at column exists
        cursor.execute("PRAGMA table_info(states)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'created_at' not in columns:
            print("Adding created_at column to states table...")
            # Add created_at column with default value
            cursor.execute("""
                ALTER TABLE states 
                ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """)
            conn.commit()
            print("Migration completed successfully!")
        else:
            print("created_at column already exists. No migration needed.")

        return True
    except Exception as e:
        print(f"Migration error: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_database() 