import datetime
import time
import uuid
import re
import asyncio
import httpx
import logging
import sqlite3
import os
from routes.config import get_connection, logger
from typing import List, Optional
from fastapi import Request, HTTPException, APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json

router = APIRouter(prefix="/api/process", tags=["Process"])

class FetchRequest(BaseModel):
    user_id: str
    model_name: str
    list_quest: List[str]
    batch_size: int

async def get_response(client: httpx.AsyncClient, question: str, model_name: str, user_id: str):
    session_id = str(uuid.uuid4())
    url = "http://172.16.10.73:8097/api/v2/chatbot/chat"
    headers = {
        "Content-Type": "application/json"
    }
    data = {

        "messages": question.strip(),
        "userId": user_id.strip(),
        "sessionId": session_id
    }
    
    start_time = time.time()
    start_time_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(start_time))
    
    try:
        response = await client.post(url, headers=headers, json=data, timeout=60.0)
        response.raise_for_status()
        res_json = response.json()
    except Exception as e:
        logger.error(f"Lỗi khi gọi API cho câu hỏi '{question}': {e}")
        res_json = None

    raw_answer = res_json.get('data', {}).get('content') if res_json else None
    
    thought = ""
    if raw_answer:
        full_text = str(raw_answer)
        thought_match = re.search(r'<\|channel>(.*?)(?:<channel\|>|<\|channel>)', full_text, flags=re.DOTALL)
        if thought_match:
            thought = thought_match.group(1).strip()
            
        answer = re.sub(r'<\|channel>.*?(?:<channel\|>|<\|channel>)', '', full_text, flags=re.DOTALL)
        answer = answer.strip()
    else:
        answer = "Không có câu trả lời hoặc lỗi API"

    end_time = time.time()
    end_time_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_time))
    calculate_time = end_time - start_time
    
    return {
        "user_id": user_id,
        "session_id": session_id,
        "model_name": model_name,
        "question": question,
        "answer": answer,
        "time_sent_question": start_time_str,
        "time_received_response": end_time_str,
        "time_executed": f"{calculate_time:.2f}s",
        "thought": thought,
        "is_checked": 0,  # 0: Chưa check
        "note": ""
    }

def save_to_db(results: List[dict]):
    """Lưu kết quả vào SQLite."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Đảm bảo bảng tồn tại (trường hợp chưa chạy creat_db.py)
    cursor.execute("""
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
    """)
    
    # Chỉ insert các cột có trong schema hiện tại (không gồm thought).
    for res in results:
        try:
            cursor.execute("""
                INSERT INTO answer (
                    user_id, session_id, model_name, question, answer, 
                    time_sent_question, time_received_response, time_executed, 
                    is_checked, note
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                res["user_id"], res["session_id"], res["model_name"], 
                res["question"], res["answer"], res["time_sent_question"], 
                res["time_received_response"], res["time_executed"], 
                res["is_checked"], res["note"]
            ))
        except sqlite3.OperationalError as e:
            logger.error(f"Lỗi khi insert database: {e}")
            
    conn.commit()
    conn.close()

@router.post("/fetch_question")
async def fetch_question(req: FetchRequest, request: Request):
    """
    Endpoint nhận vào list câu hỏi, chia thành các batch và gọi API chatbot.

    **Tham số**:
    - user_id: User ID
    - model_name: Tên model
    - list_quest: List câu hỏi
    - batch_size: Số batch
    
    **Trả về**:
    - List câu trả lời theo batch
    - Thông tin batch
    - Trasaction ID của lượt gọi API 

    Kết quả được lưu trực tiếp vào SQLite database.
    """
    transid = request.headers.get("transId", datetime.datetime.now().strftime("%Y%m%d%H%M%S"))
    logger.info(f"[{transid}] - Bắt đầu xử lý {len(req.list_quest)} câu hỏi cho model {req.model_name} với batch_size {req.batch_size}")
    
    if not req.list_quest:
        raise HTTPException(status_code=400, detail="Danh sách câu hỏi trống.")
    if req.batch_size <= 0:
        raise HTTPException(status_code=400, detail="batch_size phải lớn hơn 0.")

    async def event_generator():
        questions = req.list_quest
        batch_size = req.batch_size
        model_name = req.model_name.strip()
        user_id = req.user_id.strip()
        
        total_batches = (len(questions) - 1) // batch_size + 1
        
        async with httpx.AsyncClient() as client:
            for i in range(0, len(questions), batch_size):
                batch = questions[i:i + batch_size]
                batch_no = i // batch_size + 1
                logger.info(f"[{transid}] - Đang xử lý batch {batch_no}/{total_batches} ({len(batch)} câu hỏi)...")
                
                batch_start_time = time.time()
                tasks = [get_response(client, q, model_name, user_id) for q in batch]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                valid_results = []
                for r in batch_results:
                    if isinstance(r, dict):
                        valid_results.append(r)
                    else:
                        logger.error(f"[{transid}] - Lỗi trong batch: {r}")
                
                save_to_db(valid_results)
                
                batch_end_time = time.time()
                batch_duration = batch_end_time - batch_start_time
                
                chunk_data = {
                    "batch_no": batch_no,
                    "total_batch": total_batches,
                    "batch_size": len(batch),
                    "processed": len(valid_results),
                    "batch_time_executed": f"{batch_duration:.2f}s",
                    "results": valid_results
                }
                
                yield json.dumps(chunk_data) + "\n"
                
                if i + batch_size < len(questions):
                    await asyncio.sleep(0.1)

        logger.info(f"[{transid}] - Đã hoàn thành xử lý stream.")

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")
