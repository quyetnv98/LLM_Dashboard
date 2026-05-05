from routes.config import get_connection, logger
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/process", tags=["Get list user, model"])

@router.get("/list_users_models")
def get_users_models():
    """
    ## Lấy ra danh sách `user_id` và `model_name`

    ### Trả về  
    - **users_list** : Danh sách các user có trong db
    - **models_list** : Danh sách các model có trong
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT DISTINCT user_id, model_name  
            FROM answer
        """)

        rows = cursor.fetchall()
        logger.info(f"Lấy dữ liệu thô: {len(rows)} cặp user-model")
        conn.close()

        # Sử dụng set() để lọc duy nhất cho từng danh sách và sorted() để sắp xếp
        users_list = sorted(list(set(i["user_id"] for i in rows if i["user_id"])))
        models_list = sorted(list(set(i["model_name"] for i in rows if i["model_name"])))

        return {
            "users_list": users_list,
            "models_list": models_list
        }

    except FileNotFoundError as e:
        logger.error(str(e))
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Lỗi truy vấn database: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi truy vấn database: {str(e)}")

