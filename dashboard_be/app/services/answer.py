import sqlite3
from typing import List,Tuple,Optional,Any
import math
from app.core.logging import logger
"""
Services layer định nghĩa các query truy vấn vào db
"""
def ensure_answer_table(conn: sqlite3.Connection) -> None:
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS answer (
            user_id TEXT,
            session_id TEXT,
            model_name TEXT,
            question TEXT,
            answer TEXT,
            time_sent_question TEXT,
            time_received_response TEXT,
            time_executed TEXT,
            is_checked INTEGER,
            note TEXT
        )
        """
    )

def get_unique_user_and_models(conn: sqlite3.Connection):
    cursor = conn.cursor()
    query = f"SELECT DISTINCT user_id, model_name FROM answer"
    cursor.execute(query)
    rows = cursor.fetchall()
    # Dùng set để tự động loại bỏ trùng lặp khi tách riêng từng cột
    users_list = sorted(list({i["user_id"] for i in rows if i["user_id"]}))
    models_list = sorted(list({i["model_name"] for i in rows if i["model_name"]}))
    return {
        "users_list": users_list,
        "models_list": models_list
        }

def delete_records_by_session_ids(conn: sqlite3.Connection, session_ids: List[str]):
    cursor = conn.cursor()
    query = """
    DELETE FROM answer 
    WHERE session_id = ?
    """
    delete_values = [(session_id,) for session_id in session_ids]
    cursor.executemany(query,delete_values)
    deleted_count= cursor.rowcount
    conn.commit()
    return deleted_count

def update_records_tagging(conn: sqlite3.Connection, tagging_data :List[Tuple[int, str, str]]):
    cursor = conn.cursor()
    query = """
        UPDATE answer
        SET is_checked = ?, note = ?
        WHERE session_id = ? AND (is_checked = 0 OR is_checked IS NULL)
    """
    cursor.executemany(query, tagging_data)
    updated_count = cursor.rowcount
    conn.commit()
    return updated_count

def get_statics_summary(conn:sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN is_checked = 0 OR is_checked IS NULL THEN 1 ELSE 0 END) AS unchecked,
            SUM(CASE WHEN is_checked = 1 THEN 1 ELSE 0 END) AS correct,
            SUM(CASE WHEN is_checked = 2 THEN 1 ELSE 0 END) AS incorrect
        FROM answer
        """
    )
    row = cursor.fetchone()
    return {
        "total": row["total"],
        "unchecked": row["unchecked"],
        "correct": row["correct"],
        "incorrect": row["incorrect"],
    }

def search_answers_with_pagination(conn: sqlite3.Connection,
    query: str,
    is_checked: Optional[int],
    is_user: Optional[str],
    is_model: Optional[str],
    page_size: int,
    page_index: int,
):

    cursor = conn.cursor()
    offset = (page_index - 1) * page_size

    filters = []
    params: List[Any] = []

    query = (query or "").strip()
    if query:
        filters.append("question LIKE ?")
        params.append(f"%{query}%")
    if is_user:
        filters.append("user_id = ?")
        params.append(is_user)
    if is_model:
        filters.append("model_name = ?")
        params.append(is_model)
    if is_checked is not None:
        filters.append("is_checked = ?")
        params.append(is_checked)

    where_clause = f" WHERE {' AND '.join(filters)}" if filters else ""

    count_query = f"SELECT COUNT(*) as count FROM answer{where_clause}"
    cursor.execute(count_query, tuple(params))
    total_records = cursor.fetchone()["count"]
    total_page = math.ceil(total_records / page_size) if page_size > 0 else 1

    select_query = f"SELECT * FROM answer{where_clause} LIMIT ? OFFSET ?"
    cursor.execute(select_query, tuple(params + [page_size, offset]))
    rows = cursor.fetchall()

    return {
        "page_index": page_index,
        "total_page": total_page,
        "total_records": total_records,
        "data": [dict(row) for row in rows],
    }

def save_answers_to_db(conn: sqlite3.Connection, results: List[dict]) -> None:
    # ensure_answer_table(conn)
    cursor = conn.cursor()
    for res in results:
        try:
            cursor.execute(
                """
                INSERT INTO answer (
                    user_id, session_id, model_name, question, answer,
                    time_sent_question, time_received_response, time_executed,
                    is_checked, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    res["user_id"],
                    res["session_id"],
                    res["model_name"],
                    res["question"],
                    res["answer"],
                    res["time_sent_question"],
                    res["time_received_response"],
                    res["time_executed"],
                    res["is_checked"],
                    res["note"],
                ),
            )
        except sqlite3.OperationalError as e:
            logger.error(f"Lỗi khi insert database: {e}")
    conn.commit()
