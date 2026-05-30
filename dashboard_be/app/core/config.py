from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


BASE_DIR = Path(__file__).parents[2] #lùi ra 2 cấp thư mục từ file app/core/config.py  ở đây là thư mục dự án trong container là "root"

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
    LLM_ENDPOINT:str
    PROJECT_NAME:str ="LLM DASHBOARD"
    DB_PATH:str = f"{BASE_DIR}/database/answer_db.db" #default value khi chạy trên máy host, nếu có khai báo enviroment trong compose thì sẽ bị pydantic overwrite bằng biến môi trường. 

settings = Settings()

