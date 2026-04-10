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
    kb_top_k: int = int(os.getenv("PY_CHAT_KB_TOP_K", "6"))
    kb_candidate_k: int = int(os.getenv("PY_CHAT_KB_CANDIDATE_K", "30"))
    kb_candidate_k_excel: int = int(os.getenv("PY_CHAT_KB_CANDIDATE_K_EXCEL", "180"))
    kb_max_context_chars: int = int(os.getenv("PY_CHAT_KB_MAX_CONTEXT_CHARS", "3500"))
    vector_backend: str = os.getenv("PY_CHAT_VECTOR_BACKEND", "pgvector")
    llm_provider: str = os.getenv("PY_CHAT_LLM_PROVIDER", "mock")
    llm_model: str = os.getenv("PY_CHAT_LLM_MODEL", "mock-chat-model")
    llm_api_base: str = os.getenv("PY_CHAT_LLM_API_BASE", "")
    llm_api_key: str = os.getenv("PY_CHAT_LLM_API_KEY", "")
    llm_timeout_seconds: int = int(os.getenv("PY_CHAT_LLM_TIMEOUT_SECONDS", "20"))
    deepseek_api_base: str = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    embedding_model_name: str = os.getenv("PY_CHAT_EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
    agent_user_id: int = int(os.getenv("PY_CHAT_AGENT_USER_ID", "1"))
    agent_name: str = os.getenv("PY_CHAT_AGENT_NAME", "智能体")


settings = Settings()
