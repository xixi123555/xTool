import os
import time
from typing import Any, NotRequired, TypedDict
import uuid
from pymilvus import MilvusClient
from sentence_transformers import SentenceTransformer
from markdown_chunker import MarkdownChunkingStrategy


class Config(TypedDict):
    vectorModel: NotRequired[str]
    knowledgeName: NotRequired[str]
    dimension: NotRequired[int]
    topK: NotRequired[int]
    localFilesOnly: NotRequired[bool]


defaultConfig: Config = {
    "vectorModel": "BAAI/bge-small-zh",
    "knowledgeName": "xx_knowledge",
    "dimension": 512,
    "topK": 3,
    "localFilesOnly": True,
}


class VectorDB:
    def __init__(self, config: Config | None = None):
        if config is None:
            config = {}
        self._config = {**defaultConfig, **config}
        self._model = None
        self._client = None

    def _ensure_model(self):
        if self._model is None:
            os.environ.setdefault("DISABLE_SAFETENSORS_CONVERSION", "1")
            self._model = SentenceTransformer(
                self._config["vectorModel"],
                local_files_only=self._config["localFilesOnly"],
                model_kwargs={
                    "use_safetensors": False,
                },
            )
        return self._model

    def _ensure_client(self):
        if self._client is None:
            try:
                self._client = MilvusClient(uri="./milvus_demo.db")
            except Exception as exc:
                raise RuntimeError("无法初始化 Milvus Lite 数据库，请确认本地文件可写") from exc
        return self._client

    def _ensure_collection(self):
        client = self._ensure_client()
        collection_name = self._config["knowledgeName"]
        if not client.has_collection(collection_name):
            client.create_collection(
                collection_name=collection_name,
                dimension=self._config["dimension"],
            )

    def _initMarkdownChunk(self):
        # 初始化分片器（开启元数据，方便检索溯源）
        self._markdownChunker = MarkdownChunkingStrategy(
            min_chunk_len=256,
            soft_max_len=512,
            hard_max_len=1024,
            add_metadata=True
        )

    def initDB(self):
        """初始化向量库"""
        self._ensure_model()
        self._ensure_collection()
    
    def vectorize(self, strs: list[str]):
        """向量化"""
        embeddings = self._ensure_model().encode(strs)
        return embeddings

    def insertEmbeddingDBForVector(self, embeddings: list[Any]):
        """将向量插入向量库"""
        self._ensure_collection()
        insertItems = []
        id_base = int(time.time() * 1000)
        for index, embedding in enumerate(embeddings):
            insertItems.append({
                "id": id_base + index,
                "vector": embedding["vector"].tolist(),
                "chunk_index": index,
                "text": embedding["text"],
            })
        self._client.insert(self._config["knowledgeName"], insertItems)

    def insertEmbeddingDBForText(self, texts: list[str]):
        """将一段文本插入向量库"""
        embeddings = self.vectorize(texts)
        embedding_texts = []
        for idx, text in enumerate(texts):
            embedding_texts.append({
                "vector": embeddings[idx],
                "text": text,
            })
        self.insertEmbeddingDBForVector(embedding_texts)

    def splitMD(self, path:str):
        """markdown文档分片"""
        self._initMarkdownChunk()
        with open(path, "r", encoding="utf-8") as f:
            mdContent = f.read()
        return self._markdownChunker.chunk_markdown(mdContent)

    def insertEmbeddingDBForMD(self, path: str):
        """将指定路径下的md文档插入向量库"""
        chunks = self.splitMD(path)
        print('MD chunks:', chunks) 
        embeddings = self.vectorize(chunks)
        print('MD embeddings:', embeddings)
        embedding_texts = []
        for idx, chunk in enumerate(chunks):
            embedding_texts.append({
                "vector": embeddings[idx],
                "text": chunk,
            })
        self.insertEmbeddingDBForVector(embedding_texts)

    def search(self, query: str):
        """查询单条"""
        self._ensure_collection()
        queryVectors = self._ensure_model().encode([query])
        return self._client.search(self._config["knowledgeName"], data=queryVectors, limit=self._config["topK"], output_fields=["text"])

    def queryRewrite(self, query: str):
        topKs = self.search(query)[0]
        prompt = "【参考资料】"
        for i in range(self._config["topK"]):
            prompt += f"参考资料{i + 1}:{topKs[i]["entity"]["text"]}"
        prompt += f"用户最终问题：{query}"
        return prompt


vectorDB = VectorDB()
