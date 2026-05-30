import time
import re
import uuid
from app.core.config import settings
from app.core.logging import logger
from httpx import AsyncClient

async def get_respone(
    client: AsyncClient,
    question: str,
    model_name:str,
    user_id:str):
    session_id = str(uuid.uuid4())
    header = {"Content-Type":"application/json"}
    body = {
        "messages":question.strip(),
        "userId": user_id.strip(),
        "sessionId": session_id,
    }
    start_time = time.time()
    start_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_time))
    logger.info(f"request: {body}")
    try:
        response = await client.post(
            url=settings.LLM_ENDPOINT,
            headers=header,
            json=body,
            timeout=60,
        )
        response.raise_for_status()
        res = response.json()
    except Exception as e:
        logger.error(f"Lỗi khi gọi API cho câu hỏi '{question}': {e}")
        res = None
    
    raw_answer = res.get("data", {}).get("content") if res else None
    thought = ""
    if raw_answer:
        full_text = str(raw_answer)
        thought_match = re.search(
            r"<\|channel>(.*?)(?:<channel\|>|<\|channel>)",
            full_text,
            flags=re.DOTALL,
        )
        if thought_match:
            thought = thought_match.group(1).strip()

        answer = re.sub(
            r"<\|channel>.*?(?:<channel\|>|<\|channel>)",
            "",
            full_text,
            flags=re.DOTALL,
        )
        answer = answer.strip()
    else:
        answer = "Không có câu trả lời hoặc lỗi API"
    
    end_time= time.time()
    end_time_str = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(end_time))
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
        "is_checked": 0,
        "note": "",
    }