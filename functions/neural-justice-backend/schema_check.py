import sqlite3
import os

db_path = "neural_justice.db"
print("DB exists:", os.path.exists(db_path))
print("Absolute path:", os.path.abspath(db_path))

if not os.path.exists(db_path):
    print("ERROR: Database file not found")
    exit(0)

conn = sqlite3.connect(db_path)

cursor = conn.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
print("\n=== AVAILABLE TABLES ===")
for name, sql in cursor.fetchall():
    print(f"\n--- {name} ---\n{sql}")

print("\n=== checking activity table ===")
try:
    cursor.execute("SELECT * FROM activity LIMIT 5")
    columns = [desc[0] for desc in cursor.description]
    print(f"Columns: {columns}")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    print(f"Total rows: {len(rows)}")
except Exception as e:
    print(f"Error - {type(e).__name__}: {e}")

print("\n=== checking notifications table ===")
try:
    cursor.execute("SELECT * FROM notifications LIMIT 5")
    columns = [desc[0] for desc in cursor.description]
    print(f"Columns: {columns}")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    print(f"Total rows: {len(rows)}")
except Exception as e:
    print(f"Error - {type(e).__name__}: {e}")

print("\n=== checking stations table ===")
try:
    cursor.execute("SELECT * FROM stations LIMIT 5")
    columns = [desc[0] for desc in cursor.description]
    print(f"Columns: {columns}")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    print(f"Total rows: {len(rows)}")
except Exception as e:
    print(f"Error - {type(e).__name__}: {e}")

print("\n=== checking patrol_units table ===")
try:
    cursor.execute("SELECT * FROM patrol_units LIMIT 5")
    columns = [desc[0] for desc in cursor.description]
    print(f"Columns: {columns}")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    print(f"Total rows: {len(rows)}")
except Exception as e:
    print(f"Error - {type(e).__name__}: {e}")

conn.close()