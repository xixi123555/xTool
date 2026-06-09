from langchain_community.vectorstores import FAISS
from src.embedding import embeddingModel
db = None

def saveEmbedding(chunks, embedding):
    db = FAISS.from_documents(
        chunks,
        embedding
    )
    db.save_local("data/vector")
    return db

def getDB():
    return FAISS.load_local(
        "data/vector",
        embeddingModel,
        allow_dangerous_deserialization=True,
    )