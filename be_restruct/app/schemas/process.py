from pydantic import Field , BaseModel
from typing import Optional, List

class FetchRequest(BaseModel):
    user_id:str
    model_name: str
    list_quest: List[str]
    batch_size: int