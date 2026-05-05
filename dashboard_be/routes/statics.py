import os
import math
from routes.config import get_connection, logger

from fastapi import APIRouter, HTTPException



router = APIRouter(prefix="/api/process", tags=["Static"])



@router.get("/statics")
def get_statics():
    """
    ## Thống kê số lượng câu hỏi theo trạng thái kiểm tra:
    - `is_checked` = 0 : Chưa được check
    - `is_checked` = 1 : Đúng
    - `is_checked` = 2 : Sai
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_checked = 0 OR is_checked IS NULL THEN 1 ELSE 0 END) AS unchecked,
                SUM(CASE WHEN is_checked = 1 THEN 1 ELSE 0 END) AS correct,
                SUM(CASE WHEN is_checked = 2 THEN 1 ELSE 0 END) AS incorrect
            FROM answer
        """)

        row = cursor.fetchone()
        logger.info(f"Thống kê: {row}")
        conn.close()

        return {
            "total": row["total"],
            "unchecked": row["unchecked"],     # 0 (chưa check)
            "correct": row["correct"],          # 1 (Đúng)
            "incorrect": row["incorrect"],      # 2 (Sai)
        }

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")

