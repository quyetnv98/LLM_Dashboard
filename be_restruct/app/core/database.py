import sqlite3
import sqlalchemy
import os
from typing import Generator
from app.core.config import settings

def get_db()-> Generator[sqlite3.Connection, None,None]:
    db_path = settings.DB_PATH
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory=sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()