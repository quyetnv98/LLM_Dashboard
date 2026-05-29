from pydantic import Field , BaseModel
from typing import Optional, List

class TaggingItem(BaseModel):
    session_id: str = Field(..., description="Session ID của bản ghi")
    is_checked: int = Field(..., ge=0 , le= 2, description="0: chưa check, 1: đúng, 2: sai")
    note:Optional[str] = Field(default="", description="Ghi chú khi tagging")

class TaggingRequest(BaseModel):
    data: List[TaggingItem]