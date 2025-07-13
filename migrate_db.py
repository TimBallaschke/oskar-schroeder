import sqlite3
import os

DB_PATH = "state_data.db"

def migrate_database():
    """Add created_at and headline columns to existing states table"""
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
            print("created_at column added successfully!")
        else:
            print("created_at column already exists.")

        # Check if headline column exists
        if 'headline' not in columns:
            print("Adding headline column to states table...")
            # Add headline column
            cursor.execute("""
                ALTER TABLE states 
                ADD COLUMN headline TEXT
            """)
            conn.commit()
            print("headline column added successfully!")
        else:
            print("headline column already exists.")

        print("Migration completed successfully!")
        return True
    except Exception as e:
        print(f"Migration error: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    migrate_database() 