import random
import json
import logging

import uvicorn
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
from typing import Optional, Dict, Any
from routes.config import get_connection, logger


router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/search")
def search_questions(
    q: str,
    is_checked: int = None,
    limit: int = 20,
    offset: int = 0
):
    """
    Tìm kiếm câu hỏi trong database theo từ khóa.
    - q       : từ khóa tìm kiếm (tìm trong cột question, không phân biệt hoa/thường).
    - is_checked: lọc thêm theo nhãn (0=chưa check, 1=Đúng, 2=Sai). Bỏ trống = tất cả.
    - limit   : số bản ghi mỗi trang (mặc định 20).
    - offset  : bản ghi bắt đầu (mặc định 0 — trang 1).

    Vì 1 câu hỏi có thể được hỏi nhiều lần, kết quả có thể trả về nhiều dòng cho cùng 1 nội dung.
    Response trả về tổng số kết quả (total) để frontend tự tính số trang.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        keyword = f"%{q}%"

        # --- Base WHERE clause ---
        if is_checked is not None:
            where_clause = "WHERE question LIKE ? AND is_checked = ?"
            params_count = (keyword, is_checked)
            params_data  = (keyword, is_checked, limit, offset)
        else:
            where_clause = "WHERE question LIKE ?"
            params_count = (keyword,)
            params_data  = (keyword, limit, offset)

        # Đếm tổng số kết quả (để phân trang phía frontend)
        cursor.execute(f"SELECT COUNT(*) AS total FROM answer {where_clause}", params_count)
        total = cursor.fetchone()["total"]

        # Lấy dữ liệu theo trang
        cursor.execute(
            f"SELECT * FROM answer {where_clause} ORDER BY rowid LIMIT ? OFFSET ?",
            params_data
        )
        rows = cursor.fetchall()
        conn.close()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "page": offset // limit + 1,
            "total_pages": (total + limit - 1) // limit if total > 0 else 1,
            "results": [dict(row) for row in rows],
        }

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi tìm kiếm database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm database: {str(e)}")