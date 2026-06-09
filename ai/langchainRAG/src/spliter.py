from langchain_text_splitters import RecursiveCharacterTextSplitter
def splitText(text):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size = 500,
        chunk_overlap=100
    )
    return splitter.split_documents(text)

