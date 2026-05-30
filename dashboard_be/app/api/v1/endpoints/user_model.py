from fastapi import APIRouter, Depends, HTTPException
from sqlite3 import Connection
from app.core.database import get_db
from app.services.answer import get_unique_user_and_models
from app.core.logging import logger

router = APIRouter(tags=["Get list user, model"])

@router.get("/list_users_models")
def get_users_models(conn: Connection = Depends(get_db)):
    """
    ## Lấy ra danh sách `user_id` và `model_name`
    ### Trả về  
    - **users_list** : Danh sách các user có trong db
    - **models_list** : Danh sách các model có trong
    """
    try:
        result = get_unique_user_and_models(conn)
        logger.info(f"Lấy dữ liệu: {len(result['users_list'])} users, {len(result['models_list'])} models")
        return result
    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")
