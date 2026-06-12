from typing import List
from pydantic import BaseModel, Field

class SessionIDItem(BaseModel):
    session_id: str  = Field(..., description="Session ID của bản ghi")

class DeleteRequest(BaseModel):
    session_ids: List[SessionIDItem]
