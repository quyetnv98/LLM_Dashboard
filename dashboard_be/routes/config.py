import logging
import sqlite3
import os
from fastapi import HTTPException
from pathlib import Path

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent

# Đường dẫn tới file SQLite (tương đối với thư mục chạy server, hoặc tuyệt đối)
DB_PATH = BASE_DIR / "answer_db.db"
# logger.info(f"Database path: {DB_PATH}")
def get_connection():
    """Tạo kết nối tới SQLite database."""
    db_path = os.path.abspath(DB_PATH)
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database không tìm thấy tại: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
