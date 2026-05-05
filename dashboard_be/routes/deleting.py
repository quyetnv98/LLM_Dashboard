from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from routes.config import get_connection, logger

router = APIRouter(prefix="/api/process", tags=["Deleting"])

class SessionIDItem(BaseModel):
    session_id: str = Field(..., description="Session ID của bản ghi")

class DeleteRequest(BaseModel):
    session_ids: List[SessionIDItem]

@router.post("/deleting")
def deleting_request(request: DeleteRequest):
    """
    ## Xóa dữ liệu theo session_id

    ### Tham số đầu vào:
    - **request**:  Đối tượng chứa list session_id cần xóa

    ### Trả về:
    - **dict**: Trạng thái thành công và số lượng bản ghi đã xóa.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        #Dữ liệu để xóa (session_id,)
        delete_values = [(item.session_id,) for item in request.session_ids]

        query = """
        DELETE FROM answer 
        WHERE session_id = ?
        """
        """
        DELETE FROM answer 
        WHERE session_id = ? AND (is_checked = 0 OR is_checked IS NULL)
        """
        cursor.executemany(query, delete_values)
        delete_count = cursor.rowcount

        conn.commit()
        conn.close()

        logger.info(f"Đã xóa thành công {delete_count} bản ghi")

        return {
            "status": "success",
            "message": f"Đã cập nhật thành công {delete_count} bản ghi.",
            "updated_count": delete_count,
            "total_received": len(request.session_ids)
        }
            
    except Exception as e:
        logger.error(f"Lỗi khi thực hiện delete: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")