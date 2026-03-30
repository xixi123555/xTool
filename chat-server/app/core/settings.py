import os
from pydantic import BaseModel
from dotenv import load_dotenv


load_dotenv()


class Settings(BaseModel):
    host: str = os.getenv("PY_CHAT_HOST", "0.0.0.0")
    port: int = int(os.getenv("PY_CHAT_PORT", "5298"))
    cors_origin: str = os.getenv("PY_CHAT_CORS_ORIGIN", "*")
    jwt_secret: str = os.getenv("JWT_SECRET", "your_jwt_secret_key")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "3306"))
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "xtool_db")
    upload_dir: str = os.getenv("PY_CHAT_UPLOAD_DIR", "../server/uploads/chat")
    public_base_url: str = os.getenv("PY_CHAT_PUBLIC_BASE_URL", "http://localhost:5298")
    default_room: str = os.getenv("PY_CHAT_DEFAULT_ROOM", "public")


settings = Settings()
