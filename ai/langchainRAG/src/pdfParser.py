from langchain_community.document_loaders import PyPDFLoader
from src.spliter import splitText
from src.vectorsDB import saveEmbedding
from src.embedding import embeddingModel
import os
from langchain_community.vectorstores import FAISS
from src.vectorsDB import getDB
def upload():
    db = None
    if os.path.exists("data/vector"):
        print("存在向量库，重新创建")
        # 向量文件中存在向量库，直接加载
        db = getDB()

    else:
        loader = PyPDFLoader("src/test.pdf")
        docs = loader.load()
        strs = splitText(docs)
        db = saveEmbedding(strs, embeddingModel)
    return db
