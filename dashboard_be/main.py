# Enable CORS

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.search import router as search_router
from routes.statics import router as static_router   
from routes.process import router as fetch_router
from routes.tagging import router as tagging_router
from routes.deleting import router as deleting_router
from routes.user import router as user_router
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(user_router)
app.include_router(static_router)
app.include_router(search_router)
app.include_router(fetch_router)
app.include_router(tagging_router)
app.include_router(deleting_router) 

def main():
    uvicorn.run("main:app", host="0.0.0.0", port=8021, workers=1, reload=True)
        
if __name__ == "__main__":
    main()