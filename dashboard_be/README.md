# LLM Dashboard Backend

Backend API for the **LLM Dashboard** system — a tool to send questions to an external LLM chatbot, store responses in SQLite, and support review workflows (search, tagging, statistics, deletion).

---

## Summary

This project is a **FastAPI** REST API that sits between a frontend dashboard and an external LLM service. Its main responsibilities are:

1. **Process questions** — Accept batches of questions, call the LLM API asynchronously, stream results back to the client (NDJSON), and persist answers in a local SQLite database.
2. **Search & filter** — Paginated search over stored Q&A records by question text, user, model, and review status.
3. **Tagging / review** — Mark answers as unchecked (0), correct (1), or incorrect (2), with optional notes.
4. **Statistics** — Aggregate counts by review status.
5. **Deletion** — Remove records by `session_id`.
6. **Metadata** — List distinct `user_id` and `model_name` values from the database.

The application follows a **layered architecture**: API endpoints → services → database, with Pydantic schemas for request validation and FastAPI dependency injection for DB connections.

- **Default port:** `8021`
- **API prefix:** `/api/v1`
- **Interactive docs:** `http://localhost:8021/docs` (root `/` redirects here)

---

## Project Structure

```
dashboard_be/
├── app/
│   ├── main.py                 # FastAPI app entry point, CORS, router registration
│   ├── api/
│   │   ├── router.py           # Aggregates all v1 routes under /api/v1
│   │   └── v1/                 # Define version of API for update
│   │       └── endpoints/
│   │           ├── process.py      # POST /fetch_question — batch LLM calls (streaming)
│   │           ├── search.py       # GET  /search — paginated search
│   │           ├── statics.py      # GET  /statics — review statistics
│   │           ├── tagging.py      # POST /tagging — update review status
│   │           ├── deleting.py     # POST /deleting — delete by session_id
│   │           └── user_model.py   # GET  /list_users_models — distinct users & models
│   ├── core/
│   │   ├── config.py           # Settings from .env (pydantic-settings)
│   │   ├── database.py         # SQLite connection via get_db() dependency
│   │   └── logging.py          # Centralized logging configuration
│   ├── schemas/
│   │   ├── process.py          # FetchRequest
│   │   ├── tagging.py          # TaggingRequest, TaggingItem
│   │   └── deleting.py         # DeleteRequest, SessionIDItem
│   ├── services/
│   │   ├── chatbot.py          # Async HTTP calls to LLM API, answer parsing
│   │   └── answer.py           # SQL queries (CRUD, search, stats)
│   └── utils/
│       └── delete_untagging.py # Standalone script to purge unchecked records
├── database/
│   └── answer_db.db            # SQLite database (created at runtime; mounted in Docker)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env                        # Environment variables (not committed; see Configuration)
```

### Layer Responsibilities

| Layer | Path | Role |
|-------|------|------|
| **Entry** | `app/main.py` | Creates the FastAPI app, enables CORS, mounts routes |
| **API** | `app/api/` | HTTP handlers; validates input, calls services, returns responses |
| **Schemas** | `app/schemas/` | Pydantic models for request/response validation |
| **Services** | `app/services/` | Business logic: LLM integration and database operations |
| **Core** | `app/core/` | Configuration, DB connection factory, logging |
| **Utils** | `app/utils/` | Optional maintenance scripts |

### Request Flow (Process Questions)

```
Client (FE)
    │  POST /api/v1/fetch_question
    ▼
process.py (endpoint)
    │  validates FetchRequest
    ▼
chatbot.py (service)          answer.py (service)
    │  httpx → LLM API            │  INSERT INTO answer
    ▼                             ▼
External LLM                 SQLite (answer_db.db)
    │
    ▼
StreamingResponse (NDJSON chunks per batch)
```

---

## Libraries & Dependencies

Dependencies are listed in `requirements.txt`:

| Package | Purpose in this project |
|---------|-------------------------|
| **fastapi** | Web framework — routing, dependency injection, OpenAPI/Swagger docs, request validation |
| **uvicorn** | ASGI server used to run the application (locally and in Docker) |
| **httpx** | Async HTTP client for calling the external LLM chatbot API |
| **pydantic** | Data validation and serialization for request/response models (`BaseModel`) |
| **pydantic-settings** | Loads configuration from environment variables and `.env` (`Settings` in `config.py`) |
| **aiosqlite** | Listed in requirements; the app currently uses the built-in **`sqlite3`** module synchronously via `get_db()` |

### Standard Library (also used)

- `sqlite3` — local database
- `asyncio` — concurrent batch processing of LLM requests
- `logging` — application logs
- `re` — parse "thought" channels from LLM raw responses
- `uuid`, `time`, `json`, `math`, `os`, `pathlib` — utilities

---

## API Endpoints

All routes are prefixed with `/api/v1`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/search` | Search answers with filters (`query`, `is_checked`, `is_user`, `is_model`) and pagination |
| `GET` | `/statics` | Count total / unchecked / correct / incorrect records |
| `GET` | `/list_users_models` | Distinct `user_id` and `model_name` lists |
| `POST` | `/fetch_question` | Send question batches to LLM; stream NDJSON results; save to DB |
| `POST` | `/tagging` | Update `is_checked` and `note` by `session_id` |
| `POST` | `/deleting` | Delete records by list of `session_id` |

### Review status (`is_checked`)

| Value | Meaning |
|-------|---------|
| `0` | Not reviewed |
| `1` | Correct |
| `2` | Incorrect |

---

## Database Schema

Table: **`answer`**

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | TEXT | User identifier |
| `session_id` | TEXT | Unique session per LLM request |
| `model_name` | TEXT | LLM model name |
| `question` | TEXT | Question sent to the LLM |
| `answer` | TEXT | Parsed answer text |
| `time_sent_question` | TEXT | Request timestamp |
| `time_received_response` | TEXT | Response timestamp |
| `time_executed` | TEXT | Duration (e.g. `"1.23s"`) |
| `is_checked` | INTEGER | Review status (0 / 1 / 2) |
| `note` | TEXT | Reviewer note |

Default DB path: `{project_root}/database/answer_db.db` (overridable via `DB_PATH`).

---

## Configuration

Create a `.env` file in the project root:

```env
LLM_ENDPOINT=https://your-llm-api-url
PROJECT_NAME=LLM DASHBOARD
DB_PATH=database/answer_db.db
```

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_ENDPOINT` | Yes | URL of the external LLM chatbot API |
| `PROJECT_NAME` | No | App title in Swagger (default: `LLM DASHBOARD`) |
| `DB_PATH` | No | Path to SQLite file (default: `{BASE_DIR}/database/answer_db.db`) |

---

## Running the Application

### Local development

```bash
pip install -r requirements.txt
python -m app.main
# or
uvicorn app.main:app --host 0.0.0.0 --port 8021 --reload
```

Open Swagger UI: [http://localhost:8021/docs](http://localhost:8021/docs)

### Docker

```bash
docker compose up --build
```

`docker-compose.yml` maps port `8021`, loads `.env`, and mounts the `database/` folder as a volume so data persists across container restarts.

---

## LLM Integration

`app/services/chatbot.py` sends a POST request to `LLM_ENDPOINT` with:

```json
{
  "messages": "<question>",
  "userId": "<user_id>",
  "sessionId": "<uuid>"
}
```

The service extracts optional "thought" content from channel markers in the raw response and stores the cleaned answer. Failed API calls return a fallback message and are logged.

---

## Maintenance Utility

`app/utils/delete_untagging.py` is a standalone script that deletes all records where `is_checked = 0`:

```bash
python -m app.utils.delete_untagging
```

---

## Related Documentation

- `walkthrough.md` — Notes on the FastAPI restructure and verification steps
- `task.md` / `restructure_plan.md` — Internal planning documents
