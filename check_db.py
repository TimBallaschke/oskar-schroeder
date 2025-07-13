import sqlite3
import json
from datetime import datetime

DB_PATH = "state_data.db"

def clear_database():
    """Clear all states from the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Delete all records from the states table
        cursor.execute("DELETE FROM states")
        conn.commit()
        
        print("\nDatabase cleared successfully!")
        print("All states have been removed.")
        
    except sqlite3.Error as e:
        print(f"\nError clearing database: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def fetch_all_states():
    """Fetch and display all states from the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all states
        cursor.execute("SELECT id, content FROM states")
        rows = cursor.fetchall()
        
        if not rows:
            print("No states found in the database.")
            return
        
        print(f"\nFound {len(rows)} states in the database:\n")
        print("=" * 80)
        
        for row in rows:
            state_id, content = row
            print(f"\nState ID: {state_id}")
            print("-" * 40)
            
            try:
                # Try to parse the content as JSON for better formatting
                content_dict = json.loads(content)
                print("Content (formatted):")
                print(json.dumps(content_dict, indent=2))
            except json.JSONDecodeError:
                # If not JSON, print as is
                print("Content (raw):")
                print(content)
            
            print("=" * 80)
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def search_states(search_term):
    """Search for states containing specific text"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Search in both ID and content
        cursor.execute("""
            SELECT id, content 
            FROM states 
            WHERE id LIKE ? OR content LIKE ?
        """, (f'%{search_term}%', f'%{search_term}%'))
        
        rows = cursor.fetchall()
        
        if not rows:
            print(f"\nNo states found matching '{search_term}'")
            return
        
        print(f"\nFound {len(rows)} states matching '{search_term}':\n")
        print("=" * 80)
        
        for row in rows:
            state_id, content = row
            print(f"\nState ID: {state_id}")
            print("-" * 40)
            
            try:
                content_dict = json.loads(content)
                print("Content (formatted):")
                print(json.dumps(content_dict, indent=2))
            except json.JSONDecodeError:
                print("Content (raw):")
                print(content)
            
            print("=" * 80)
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def delete_state(state_id):
    """Delete a specific state from the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM states WHERE id = ?", (state_id,))
        conn.commit()
        
        if cursor.rowcount > 0:
            print(f"\nSuccessfully deleted state {state_id}")
        else:
            print(f"\nNo state found with ID {state_id}")
            
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "search" and len(sys.argv) > 2:
            search_states(sys.argv[2])
        elif command == "delete" and len(sys.argv) > 2:
            delete_state(sys.argv[2])
        elif command == "clear":
            clear_database()
        else:
            print("Invalid command or missing arguments")
            print("Usage:")
            print("  python check_db.py                    # List all states")
            print("  python check_db.py search <term>      # Search states")
            print("  python check_db.py delete <state_id>  # Delete a state")
            print("  python check_db.py clear              # Clear all states")
    else:
        fetch_all_states()