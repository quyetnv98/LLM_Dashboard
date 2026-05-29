from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import os

load_dotenv()
BASE_DIR = Path(__file__).parents[2]

class Settings(BaseSettings):
        
    '''
    Tạo config để đọc env không thông qua load dotenv

    '''
    ## pydantic v1 sử dụng class Config
    # class Config:
    #     env_file = ".env"
    #     case_sensitive = True
    #     extra = "ignore"

    #pydantic v2 sử dụng model_config 
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True
    )
    PROJECT_NAME:str ="LLM DASHBOARD"
    DB_PATH:str = f"{BASE_DIR}/database/answer_db.db"
    LLM_ENDPOINT:str

settings = Settings()

