from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from app.core.database import get_db
from app.core.logging import logger
from app.services.answer import get_statics_summary

router = APIRouter(tags=["Static"])

@router.get("/statics")
def get_statics(conn: Connection = Depends(get_db)):
    """
    ## Thống kê số lượng câu hỏi theo trạng thái kiểm tra:
    - `is_checked` = 0 : Chưa được check
    - `is_checked` = 1 : Đúng
    - `is_checked` = 2 : Sai
    """
    try:
        result = get_statics_summary(conn=conn)
        logger.info(f"Thống kê: {result}")
        return result

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")

