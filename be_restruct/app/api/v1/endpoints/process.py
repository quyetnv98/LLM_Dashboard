from fastapi.responses import StreamingResponse
from fastapi import Request,FastAPI,APIRouter,Depends
import httpx
import asyncio
import json
import datetime
from app.schemas.process import FetchRequest
from app.core.database import get_db
from app.services.answer import save_answers_to_db
from app.services.chatbot import get_respone
from sqlite3 import Connection
from  app.core.logging import logger
router = APIRouter(tags=["Process"])

@router.post("/fetch_question")
async def fetch_question(req: FetchRequest, request: Request, conn: Connection= Depends(get_db)):
    """
    ## Endpoint nhận vào list câu hỏi, chia thành các batch và gọi API chatbot.

    ### Tham số:
    - **user_id**: User ID
    - **model_name**: Tên model
    - **list_quest**: List câu hỏi
    - **batch_size**: Số batch
    
    ### Trả về:
    - List câu trả lời theo batch
    - Thông tin batch
    - Trasaction ID của lượt gọi API 

    *Kết quả được lưu vào SQLite.*
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
    
        try:
            async with httpx.AsyncClient() as client:
                for i in range(0, len(questions), batch_size):
                    batch_num = i // batch_size + 1
                    batch = questions[i:i + batch_size]
                    try:
                        logger.info(f"[{transid}] - Đang xử lý batch {batch_num}/{total_batches}...")
                        
                        batch_start_time = time.time()
                        tasks = [get_respone(client, q, model_name, user_id) for q in batch]
                        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                        
                        valid_results = []
                        for idx, r in enumerate(batch_results):
                            if isinstance(r, dict):
                                valid_results.append(r)
                            else:
                                # Nếu r là Exception (do return_exceptions=True), tạo kết quả thông báo lỗi
                                logger.error(f"[{transid}] - Lỗi câu hỏi '{batch[idx]}': {r}")
                                valid_results.append({
                                    "user_id": user_id,
                                    "session_id": "ERROR_ITEM",
                                    "model_name": model_name,
                                    "question": batch[idx],
                                    "answer": f"Lỗi hệ thống: {str(r)}",
                                    "time_sent_question": time.strftime('%Y-%m-%d %H:%M:%S'),
                                    "time_received_response": time.strftime('%Y-%m-%d %H:%M:%S'),
                                    "time_executed": "0.00s",
                                    "thought": "",
                                    "is_checked": 0,
                                    "note": "",
                                    "error": True
                                })
                        
                        # Lưu vào DB 
                        try:
                            save_answers_to_db(conn=conn,results=[r for r in valid_results if not r.get("error")])
                        except Exception as e:
                            logger.error(f"Lỗi khi lưu DB cho batch {batch_num}: {e}")

                        batch_duration = time.time() - batch_start_time
                        
                        chunk_data = {
                            "batch_num": batch_num,
                            "total_batch": total_batches,
                            "batch_size": len(batch),
                            "processed": len(valid_results),
                            "batch_time_executed": f"{batch_duration:.2f}s",
                            "results": valid_results
                        }
                        
                        logger.info("chunk_data: {}".format(json.dumps(chunk_data, ensure_ascii=False)))
                        yield f"{json.dumps(chunk_data, ensure_ascii=False)}\n" 

                    except Exception as e:
                        # Bắt lỗi nghiêm trọng phát sinh trong quá trình xử lý batch
                        logger.error(f"[{transid}] - Lỗi batch {batch_num}: {e}")
                        
                        # Tạo danh sách kết quả lỗi cho tất cả các câu trong batch này
                        error_results = []
                        for q in batch:
                            error_results.append({
                                "user_id": user_id,
                                "session_id": "ERROR_BATCH",
                                "model_name": model_name,
                                "question": q,
                                "answer": f"Lỗi API hoặc không kết nối được: {str(e)}",
                                "time_sent_question": time.strftime('%Y-%m-%d %H:%M:%S'),
                                "time_received_response": time.strftime('%Y-%m-%d %H:%M:%S'),
                                "time_executed": "0.00s",
                                "thought": "",
                                "is_checked": 0,
                                "note": "",
                                "error": True
                            })

                        error_chunk = {
                            "batch_num": batch_num,
                            "total_batch": total_batches,
                            "batch_size": len(batch),
                            "processed": len(batch),
                            "batch_time_executed": "0.00s",
                            "results": error_results
                        }
                        yield f"{json.dumps(error_chunk, ensure_ascii=False)}\n"
                        continue
                    
                    if i + batch_size < len(questions):
                        await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            logger.warn(f"[{transid}] - Stream bị hủy bởi Client (Người dùng dừng hoặc đóng trình duyệt).")
        except Exception as e:
            logger.error(f"[{transid}] - Lỗi hệ thống trong generator: {e}")
        finally:
            logger.info(f"[{transid}] - Đã hoàn thành.")

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")
