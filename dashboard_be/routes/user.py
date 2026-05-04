import os
import math
from routes.config import get_connection, logger

from fastapi import APIRouter, HTTPException



router = APIRouter(prefix="/api/process", tags=["Users"])



@router.get("/users")
def get_users():
    """
    Lấy danh sách user:
    - trả về  list user_id trong database
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT user_id  
            FROM answer
        """)

        row = cursor.fetchall()
        logger.info(f"Thống kê: {row}")
        conn.close()
        # convert to list of dict
        users_list = [i["user_id"] for i in row]
        return {"list_users":users_list}

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")

