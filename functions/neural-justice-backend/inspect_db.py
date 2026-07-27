import sqlite3
import os

db_path = "neural_justice.db"
if not os.path.exists(db_path):
    print("Database file not found at:", db_path)
    import glob
    print("Available files:", glob.glob("*"))
    exit(0)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. List all tables and their real schema
print("=== TABLE DEFINITIONS ===")
cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table';")
for name, sql in cur.fetchall():
    print(f"\n--- {name} ---")
    print(sql)
    print()

# 2. Sample rows from candidate tables for /api/intelligence/warnings
print("\n=== CANDIDATE TABLES FOR /api/intelligence/warnings ===")
for table in ["activity", "notifications"]:
    try:
        print(f"\n--- sample rows: {table} ---")
        cur.execute(f"SELECT * FROM {table} LIMIT 5;")
        rows = cur.fetchall()
        if rows:
            cols = [d[0] for d in cur.description]
            print("Columns:", cols)
            for row in rows:
                print(row)
            print(f"Total rows: {len(rows)}")
        else:
            print("No rows in table")
    except Exception as e:
        print(f"Error reading {table}: {e}")

# 3. Sample rows from candidate tables for /api/intelligence/patrol-recommendations
print("\n=== CANDIDATE TABLES FOR /api/intelligence/patrol-recommendations ===")
for table in ["patrol_units", "stations"]:
    try:
        print(f"\n--- sample rows: {table} ---")
        cur.execute(f"SELECT * FROM {table} LIMIT 5;")
        rows = cur.fetchall()
        if rows:
            cols = [d[0] for d in cur.description]
            print("Columns:", cols)
            for row in rows:
                print(row)
            print(f"Total rows: {len(rows)}")
        else:
            print("No rows in table")
    except Exception as e:
        print(f"Error reading {table}: {e}")

conn.close()