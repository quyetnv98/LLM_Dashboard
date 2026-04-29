
import sqlite3
import os

db_path = "answer_db.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(answer)")
    columns = cursor.fetchall()
    for col in columns:
        print(dict(col))
    conn.close()
else:
    print("Database file not found")
