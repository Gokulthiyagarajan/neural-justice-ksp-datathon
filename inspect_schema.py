import sqlite3
import os

db_path = "functions/neural-justice-backend/neural_justice.db"
print("DB exists:", os.path.exists(db_path))
print("Resolved path:", os.path.abspath(db_path))

try:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table';")
    print("\n=== ALL TABLES ===")
    for name, sql in cur.fetchall():
        print(f"--- {name} ---\n{sql}\n")

    # Only try 'activity' if it exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity';")
    if cur.fetchone():
        print("\n=== ACTIVITY TABLE SAMPLE ===")
        cur.execute("SELECT * FROM activity LIMIT 10;")
        columns = [d[0] for d in cur.description]
        print("Columns:", columns)
        rows = cur.fetchall()
        for row in rows:
            print(row)
        print(f"Total activity rows: {len(rows)}")
        
        # Look for action/status columns
        print("\n=== activity column values ===")
        sample_col = None
        for col in columns:
            if col.lower() in ['action', 'type', 'severity', 'status']:
                sample_col = col
                break
        
        if sample_col:
            cur.execute(f"SELECT DISTINCT {sample_col} FROM activity LIMIT 20;")
            values = [r[0] for r in cur.fetchall()]
            print(f"Sample values for '{sample_col}': {values}")
    else:
        print("activity table does not exist")

    # Try notifications
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications';")
    if cur.fetchone():
        print("\n=== NOTIFICATIONS TABLE SAMPLE ===")
        cur.execute("SELECT * FROM notifications LIMIT 10;")
        columns = [d[0] for d in cur.description]
        print("Columns:", columns)
        rows = cur.fetchall()
        for row in rows:
            print(row)
        print(f"Total notifications rows: {len(rows)}")

    # Try stations and patrol_units
    for table in ["stations", "patrol_units"]:
        cur.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}';")
        if cur.fetchone():
            print(f"\n=== {table.upper()} TABLE SAMPLE ===")
            cur.execute(f"SELECT * FROM {table} LIMIT 5;")
            cols = [d[0] for d in cur.description]
            print("Columns:", cols)
            for row in cur.fetchall():
                print(row)
    
    conn.close()
    
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
END