import os
from routes.config import get_connection, logger

from fastapi import APIRouter, HTTPException



router = APIRouter(prefix="/api/get_from_db", tags=["get_from_db"])



@router.get("/stats")
def get_stats():
    """
    Thống kê số lượng câu hỏi theo trạng thái kiểm tra:
    - is_checked = 0 : Chưa được check
    - is_checked = 1 : Đúng
    - is_checked = 2 : Sai
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
        conn.close()

        return {
            "total": row["total"],
            "unchecked": row["unchecked"],     # nhãn 0 (chưa check)
            "correct": row["correct"],          # nhãn 1 (Đúng)
            "incorrect": row["incorrect"],      # nhãn 2 (Sai)
        }

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")


@router.get("/records")
def get_records(
    is_checked: int = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Lấy danh sách các bản ghi từ database.
    - is_checked: lọc theo nhãn (0=chưa check, 1=Đúng, 2=Sai). Bỏ trống = lấy tất cả.
    - limit: số bản ghi tối đa trả về (mặc định 50).
    - offset: phân trang (mặc định 0).
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        if is_checked is not None:
            cursor.execute(
                "SELECT * FROM answer WHERE is_checked = ? LIMIT ? OFFSET ?",
                (is_checked, limit, offset)
            )
        else:
            cursor.execute(
                "SELECT * FROM answer LIMIT ? OFFSET ?",
                (limit, offset)
            )

        rows = cursor.fetchall()
        conn.close()

        return [dict(row) for row in rows]

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")



