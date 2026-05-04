import random
import json
import logging
import math
import uvicorn
from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from routes.config import get_connection, logger


router = APIRouter(prefix="/api/process", tags=["Search"])


@router.get("/search")


def search_questions(
    query: str = "",
    is_checked: int = None, #Nếu không có lấy toàn bộ các trạng thái
    is_user: str = None,  # Nếu không có lấy toàn bộ
    is_model: str = None, #Nếu không có lấy toàn bộ
    page_size: int = 50, #nhận từ FE mặc định 20
    page_index: int = 1  # Nhận page_index từ FE
):
    """
    Tham số đầu vào:
    - query: Câu hỏi tìm kiếm, nếu không có lấy tất
    - is_checked: Trạng thái kiểm tra nếu không có lấy toàn bộ
    - is_user: User ID nếu không có lấy toàn bộ
    - is_model: Model name nếu không có lấy toàn bộ
    - page_size: Số bản ghi mỗi trangtất, mặc định 50 trong swagger, mặc định FE truyền là 20
    - page_index: Chỉ số trang 
        
    Trả về:
    - Dữ liệu tìm kiếm
    - Tổng số bản ghi
    - Tổng số trang
    - Chỉ số trang hiện tại
        """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Tính toán offset từ page_index và page_size

        offset = (page_index - 1) * page_size

        # Build điều kiện query động theo filter truyền vào
        filters = []
        params = []

        query = (query or "").strip()
        if query:
            filters.append("question LIKE ?")
            params.append(f"%{query}%")
        if is_user:
            filters.append("user_id = ?")
            params.append(is_user)
        if is_model:
            filters.append("model_name = ?")
            params.append(is_model)

        if is_checked is not None:
            filters.append("is_checked = ?")
            params.append(is_checked)


        where_clause = f" WHERE {' AND '.join(filters)}" if filters else ""
        logger.info({
            "query": query,
            "is_user": is_user,
            "is_model": is_model,
            "is_checked" : is_checked,
            "page_size": page_size,
            "page_index": page_index
        })
        # 1. Lấy tổng số bản ghi để tính total_page
        count_query = f"SELECT COUNT(*) as count FROM answer{where_clause}"
        cursor.execute(count_query, tuple(params))

        total_records = cursor.fetchone()["count"]
        total_page = math.ceil(total_records / page_size) if page_size > 0 else 1

        # 2. Lấy dữ liệu theo phân trang
        select_query = f"SELECT * FROM answer{where_clause} LIMIT ? OFFSET ?"
        logger.info(select_query)
        cursor.execute(select_query, tuple(params + [page_size, offset]))

        rows = cursor.fetchall()
        conn.close()

        return {
            "page_index": page_index,
            "total_page": total_page,
            "total_records": total_records,
            "data": [dict(row) for row in rows]
        }
   
    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")