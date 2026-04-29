from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from routes.config import get_connection, logger

router = APIRouter(prefix="/api", tags=["Tagging"])

class TaggingItem(BaseModel):
    session_id: str = Field(..., description="Session ID của bản ghi")
    is_checked: int = Field(..., ge=1, le=2, description="1: đúng, 2: sai")
    note: Optional[str] = Field(default="", description="Ghi chú khi tagging")

class TaggingRequest(BaseModel):
    data: List[TaggingItem]

@router.post("/tagging")
def update_tagging(request: TaggingRequest):
    """
    API cập nhật trạng thái tagging cho danh sách dữ liệu.
    Theo yêu cầu: Cập nhật các bản ghi có trạng thái is_checked là 0 ở DB.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Chuẩn bị dữ liệu để update: (is_checked, note, session_id)
        update_values = [
            (item.is_checked, item.note, item.session_id)
            for item in request.data
        ]
        
        # Câu lệnh SQL update hàng loạt sử dụng executemany
        # Chỉ update những bản ghi đang ở trạng thái chưa check (0 hoặc NULL)
        query = """
            UPDATE answer 
            SET is_checked = ?, note = ? 
            WHERE session_id = ? AND (is_checked = 0 OR is_checked IS NULL)
        """
        
        cursor.executemany(query, update_values)
        updated_count = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        logger.info(f"Đã cập nhật tagging cho {updated_count} bản ghi.")
        
        return {
            "status": "success",
            "message": f"Đã cập nhật thành công {updated_count} bản ghi.",
            "updated_count": updated_count,
            "total_received": len(request.data)
        }
        
    except Exception as e:
        logger.error(f"Lỗi khi thực hiện tagging: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")