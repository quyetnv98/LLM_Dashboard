from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from app.core.database import get_db
from app.core.logging import logger
from app.services.answer import search_answers_with_pagination
from typing import Optional

router = APIRouter(tags=["Search"])

@router.get("/search")
def search_questions_endpoint(
    query: str = "",
    is_checked: Optional[int] = None,
    is_user: Optional[str] = None,
    is_model: Optional[str] = None,
    page_size: int = 50,
    page_index: int = 1,
    conn: Connection = Depends(get_db),
):  
    """
    ### Tham số đầu vào:
    - **query**: Câu hỏi tìm kiếm, nếu không có lấy tất
    - **is_checked**: Trạng thái kiểm tra nếu không có lấy toàn bộ
    - **is_user**: User ID nếu không có lấy toàn bộ
    - **is_model**: Model name nếu không có lấy toàn bộ
    - **page_size**: Số bản ghi mỗi trangtất, mặc định 50 trong swagger, mặc định FE truyền là 20
    - **page_index**: Chỉ số trang 
        
    ### Trả về:
    - Dữ liệu tìm kiếm
    - Tổng số bản ghi
    - Tổng số trang
    - Chỉ số trang hiện tại
        """
    try:

        logger.info({
            "query": query,
            "is_user": is_user,
            "is_model": is_model,
            "is_checked" : is_checked,
            "page_size": page_size,
            "page_index": page_index
        })
        result = search_answers_with_pagination(
        conn=conn,
        query=query,
        is_checked=is_checked,
        is_user=is_user,
        is_model=is_model,
        page_size=page_size,
        page_index=page_index,
        )
        return result
   
    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")