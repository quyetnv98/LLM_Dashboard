# FastAPI Project Restructuring Plan

This plan guides you through reorganizing your project from its current flat/basic structure into a standard, clean-architecture production layout. 

---

## 1. Current vs Proposed Structure

### Current Structure
At present, your project is laid out like this:
```text
dashboard_be/
├── routes/
│   ├── config.py          # Contains DB connections and logging config
│   ├── deleting.py        # Deletion route with embedded SQL queries
│   ├── process.py         # Chatbot interaction, async logic & database insert
│   ├── search.py          # Search route with pagination and query building
│   ├── statics.py         # Summary statistics route
│   ├── tagging.py         # Update route
│   └── user_model.py      # User model fetch route
├── utils/
│   └── delete_untag.py    # Empty utility script
├── Dockerfile             # Runs python main.py
├── docker-compose.yml     # Mounts and runs backend container
├── main.py                # FastAPI entry point, CORS middleware, includes routers
└── requirements.txt       # Project dependencies
```

### Proposed Structure (FastAPI Best Practice Layout)
A standard enterprise-grade FastAPI structure separates concerns (database, configurations, route endpoints, data schemas, and core services/CRUD operations):

```text
dashboard_be/
├── app/
│   ├── __init__.py
│   ├── main.py            # Entrypoint (Instantiates FastAPI and includes router)
│   ├── core/              # Global configs and shared clients
│   │   ├── __init__.py
│   │   ├── config.py      # App settings (Pydantic Settings)
│   │   ├── database.py    # Database connection manager (SQLite, PostgreSQL, etc.)
│   │   └── logging.py     # Centralized logger setup
│   ├── api/               # API endpoints
│   │   ├── __init__.py
│   │   ├── router.py      # Master router that registers all sub-routers
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/
│   │       │   ├── __init__.py
│   │       │   ├── search.py
│   │       │   ├── statics.py
│   │       │   ├── process.py
│   │       │   ├── tagging.py
│   │       │   ├── deleting.py
│   │       │   └── user_model.py
│   ├── schemas/           # Pydantic schemas (Request/Response models)
│   │   ├── __init__.py
│   │   ├── process.py
│   │   ├── tagging.py
│   │   └── deleting.py
│   └── services/          # Business logic, DB operations (CRUD), External API integrations
│       ├── __init__.py
│       ├── answer.py      # DB operations on 'answer' table (CRUD logic)
│       └── chatbot.py     # External chatbot HTTP client request handler
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 2. Benefits of Restructuring
1. **Separation of Concerns (SoC)**: Routers only handle HTTP parameters, statuses, and flow control. SQL queries go to `services/`, Pydantic models go to `schemas/`, and setups go to `core/`.
2. **Reusability**: Database utilities or API request logic (`services/`) can be imported elsewhere (e.g., CLI tools or background workers) without spinning up a FastAPI instance.
3. **Environment-driven Configurations**: Utilizing `Pydantic Settings` for environments, avoiding hardcoded URLs like `http://172.16.10.73:8097` directly inside business logic.
4. **Easier Testing**: Standard structure allows mock fixtures to be written easily for databases or external API requests.

---

## 3. Step-by-Step Migration Guide

### Step 3.1: Define App Configs (`app/core/config.py`)
Centralize all environment variables using Pydantic Settings. First, add `pydantic-settings` to your `requirements.txt`.

```python
# app/core/config.py
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "LLM Dashboard API"
    DB_PATH: str = str(BASE_DIR / "answer_db.db")
    CHATBOT_API_URL: str = "http://172.16.10.73:8097/api/v2/chatbot/chat"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

### Step 3.2: Manage DB Connections (`app/core/database.py`)
Separate the connection factory.

```python
# app/core/database.py
import sqlite3
import os
from app.core.config import settings

def get_db_connection():
    db_path = os.path.abspath(settings.DB_PATH)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
```
*Note: Using a generator `yield` allows FastAPI's dependency injection (`Depends`) to automatically open and close the database connection safely.*

### Step 3.3: Separate Pydantic Schemas (`app/schemas/`)
Move request models out of the router files into a separate schemas directory.

Example:
```python
# app/schemas/tagging.py
from pydantic import BaseModel, Field
from typing import List, Optional

class TaggingItem(BaseModel):
    session_id: str = Field(..., description="Session ID của bản ghi")
    is_checked: int = Field(..., ge=0, le=2, description="0: chưa check, 1: đúng, 2: sai")
    note: Optional[str] = Field(default="", description="Ghi chú khi tagging")

class TaggingRequest(BaseModel):
    data: List[TaggingItem]
```

### Step 3.4: Move SQL and External APIs to `services/`
Isolate the database queries and third-party interactions from the FastAPI router. This makes it clean and testable.

Example of moving the deletion function out of router:
```python
# app/services/answer.py
import sqlite3
from typing import List

def delete_by_session_ids(conn: sqlite3.Connection, session_ids: List[str]) -> int:
    cursor = conn.cursor()
    delete_values = [(sid,) for sid in session_ids]
    query = """
    DELETE FROM answer 
    WHERE session_id = ?
    """
    cursor.executemany(query, delete_values)
    delete_count = cursor.rowcount
    conn.commit()
    return delete_count
```

### Step 3.5: Clean up Routers (`app/api/v1/endpoints/`)
Now, endpoints only parse inputs, call services, and return results.

Example for deleting router:
```python
# app/api/v1/endpoints/deleting.py
from fastapi import APIRouter, HTTPException, Depends
from sqlite3 import Connection
from app.schemas.deleting import DeleteRequest
from app.core.database import get_db_connection
from app.services.answer import delete_by_session_ids
from app.core.logging import logger

router = APIRouter(prefix="/deleting", tags=["Deleting"])

@router.post("")
def delete_records(request: DeleteRequest, conn: Connection = Depends(get_db_connection)):
    try:
        session_ids = [item.session_id for item in request.session_ids]
        deleted = delete_by_session_ids(conn, session_ids)
        logger.info(f"Đã xóa thành công {deleted} bản ghi")
        return {
            "status": "success",
            "message": f"Đã cập nhật thành công {deleted} bản ghi.",
            "updated_count": deleted,
            "total_received": len(session_ids)
        }
    except Exception as e:
        logger.error(f"Lỗi khi thực hiện delete: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")
```

### Step 3.6: Master Router Setup (`app/api/router.py`)
Combine all endpoints into one central router, which keeps `app/main.py` clean.

```python
# app/api/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import (
    search, statics, process, tagging, deleting, user_model
)

api_router = APIRouter(prefix="/api/process")

api_router.include_router(user_model.router)
api_router.include_router(statics.router)
api_router.include_router(search.router)
api_router.include_router(process.router)
api_router.include_router(tagging.router)
api_router.include_router(deleting.router)
```

### Step 3.7: Main Entry Point (`app/main.py`)
Instantiate the FastAPI application and mount middleware and endpoints.

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8021, reload=True)
```

---

## 4. Updates for Docker and Deployment

### Dockerfile Adjustment
Since code is moved under the `app/` folder, run command should point to `app.main:app` or run python on `app/main.py`.
```dockerfile
# Dockerfile
...
# Copy toàn bộ code
COPY . .

# Run command (using uvicorn directly)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8021"]
```

### docker-compose.yml Adjustment
Ensure the database path points to your mapped volume directory.
```yaml
environment:
  - DB_PATH=/app/data/answer_db.db
```
The environment variable `DB_PATH` is automatically read by Pydantic settings.
