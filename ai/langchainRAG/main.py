from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from src.llm import query
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import json

class MessageRequestBody(BaseModel):
    message: str

class SSEItem(BaseModel):
    type: str
    a: str


# model = SentenceTransformer("BAAI/bge-small-zh")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # 允许携带Cookie/Token
    allow_methods=["*"],  # 允许所有请求方法（GET/POST/PUT/DELETE等）
    allow_headers=["*"],  # 允许所有请求头
)

@app.post("/chat")
async def chat(message: MessageRequestBody):
    content = query("说说健全产业健康有序发展促进机制的举措").content
    async def event_generator():
        obj = {"type": "ss1", "a": content}
        yield f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"

    # 返回 SSE 响应，并设置必要的防缓冲头
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9000)
