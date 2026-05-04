from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.sse import EventSourceResponse
from fastapi.responses import StreamingResponse
from sentence_transformers import SentenceTransformer
from utils.vectorDB import vectorDB
from utils.llm import llm
import asyncio
import uvicorn
import json
from pydantic import BaseModel
# import chromadb
# from chromadb.utils import embedding_functions

# bge_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
#     model_name = "BAAI/bge-small-zh"
# )

# chroma_client = chromadb.PersistentClient(path="./chroma_db")
# collection = chroma_client.get_or_create_collection(
#     name="xx_embedding_db",
#     embedding_function = bge_ef
# )
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
    # 定义 SSE 生成器
    async def event_generator():
        # obj = {"type": "ss1", "a": llm.getLLMAnswer(vectorDB.queryRewrite(message.message))}
        # yield f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"
        stream = llm.getLLMStreamAnswer(vectorDB.queryRewrite(message.message))
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                obj = {"type": "ss1", "a": content}
                yield f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"
            
        # items = [
        #     {"type": "ss1", "a": message.message},
        #     {"type": "ss2", "a": message.message},
        #     {"type": "ss3", "a": message.message},
        #     {"type": "ss4", "a": message.message},
        # ]
        # for item in items:
        #     # 先发送数据
        #     yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"
        #     # 再等待 2 秒，这样第一条消息立即到达
        #     await asyncio.sleep(0.5)

    async def _background_search() -> None:
        embeddings = await asyncio.to_thread(vectorDB.search, message.message)
        print(f"嵌入向量是: {embeddings}")
        print(f"11111:{vectorDB.queryRewrite(message.message)}")

    asyncio.create_task(_background_search())

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

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """ 文件上传接口 """
    docs = [
        "苹果是一种营养丰富的水果。",
        "Python是一种简洁易学的编程语言。",
        "机器学习是人工智能的一个重要分支。",
        "香蕉含有丰富的钾元素。"
    ]
    await asyncio.to_thread(vectorDB.insertEmbeddingDBForText, docs)
    fileName = file.filename
    content = await file.read()
    # embeddingData = await getEmbeddingData(["如何使用bge-small-zh模型？"])
    # print('111111111', embeddingData)
    # texts = ["你好，世界！", "如何使用bge-small-zh模型？", "Chroma是一个轻量级向量数据库。"]
    # ids = [f"doc_{i}" for i in range(len(texts))]
    # metadatas = [{"source": f"source_{i}"} for i in range(len(texts))]
    # collection.add(documents=texts, ids=ids, metadatas=metadatas)
    # # 4. 查询：同样传入自然语言问题，Chroma 会自动向量化后检索
    # results = collection.query(query_texts=["如何选择向量数据库？"], n_results=2)
    # print('66666666', results['documents'])  # 应该能返回最相关的文档块
    with open(f"./files/{fileName}", "wb") as f:
        f.write(content)
    
    return JSONResponse({
        "message": "上传成功！"
    })
    
async def getEmbeddingData(sentence):
    embeddings = await asyncio.to_thread(model.encode, sentence)
    return embeddings

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9000)