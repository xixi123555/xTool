from langchain_huggingface import HuggingFaceEmbeddings

embeddingModel = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-zh"
)