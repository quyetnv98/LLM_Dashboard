from sqlite3 import Connection
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.core.logging import logger
from app.services.answer import delete_records_by_session_ids
from app.schemas.deleting import DeleteRequest

router = APIRouter(tags=["Deleting"])

@router.post("/deleting")
def deleting_request(request: DeleteRequest, conn:Connection = Depends(get_db)):
    """
    ## Xóa dữ liệu theo session_id

    ### Tham số đầu vào:
    - **request**:  Đối tượng chứa list session_id cần xóa

    ### Trả về:
    - **dict**: Trạng thái thành công và số lượng bản ghi đã xóa.
    """
    try:
        delete_values = [item.session_id for item in request.session_ids]
        deleted_count = delete_records_by_session_ids(conn=conn , session_ids=delete_values)
        logger.info(f"Đã xóa thành công {deleted_count} bản ghi")

        return {
            "status": "success",
            "message": f"Đã xoá thành công {deleted_count} bản ghi.",
            "updated_count": deleted_count,
            "total_received": deleted_count,
        }
            
    except Exception as e:
        logger.error(f"Lỗi khi thực hiện delete: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")