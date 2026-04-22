import logging
import sqlite3
import os
from fastapi import HTTPException

# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Đường dẫn tới file SQLite (tương đối với thư mục chạy server, hoặc tuyệt đối)
DB_PATH = "./answer_db.db"

def get_connection():
    """Tạo kết nối tới SQLite database."""
    db_path = os.path.abspath(DB_PATH)
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database không tìm thấy tại: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
