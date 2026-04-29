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

# Ưu tiên lấy đường dẫn từ biến môi trường, nếu không có thì dùng mặc định
DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "answer_db.db"))

def get_connection():
    """Tạo kết nối tới SQLite database."""
    db_path = os.path.abspath(DB_PATH)
    
    # Tạo thư mục cha nếu chưa tồn tại (hữu ích khi dùng Volume)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

if __name__ == "__main__":
    pass