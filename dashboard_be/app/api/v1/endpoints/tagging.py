from sqlite3 import Connection
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.core.logging import logger
from app.services.answer import update_records_tagging
from app.schemas.tagging import TaggingRequest

router = APIRouter(tags=["Tagging"])

@router.post("/tagging")
def tagging_request(request: TaggingRequest, conn:Connection = Depends(get_db)):
    """
   ## Cập nhật trạng thái tagging cho danh sách dữ liệu.

    ### Tham số đầu vào:
    - `request`: Đối tượng chứa list các câu hỏi cần tagging.
    - Mỗi item trong list `data` bao gồm:
        - **session_id**: ID của phiên làm việc.
        - **is_checked**: Trạng thái tagging (0: chưa check, 1: đúng, 2: sai).
        - **note**: Ghi chú chi tiết cho bản ghi.

    ### Trả về:
    - **dict**: Trạng thái thành công và số lượng bản ghi đã cập nhật.
    """
    try:
        # Chuẩn bị dữ liệu để update: (is_checked, note, session_id)
        update_values = [
            (item.is_checked, item.note, item.session_id)
            for item in request.data
        ]
        updated_count= update_records_tagging(conn=conn, tagging_data=update_values)
        logger.info(f"Đã cập nhật tagging cho {updated_count} bản ghi.")
        return {
            "status": "success",
            "message": f"Đã cập nhật thành công {updated_count} bản ghi.",
            "updated_count": updated_count,
            "total_received": updated_count
        }
    
    except Exception as e:
        logger.error(f"Lỗi khi thực hiện tagging: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")
