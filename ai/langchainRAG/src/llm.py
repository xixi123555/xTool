from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate
from src.retrieval import retrieval
from src.pdfParser import upload

load_dotenv()

model = ChatOpenAI(model="deepseek-v4-pro")

def query(question):
    # 拼接提示词
    db = upload()
    chunks = retrieval(db,question)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "你是一个知识库查询助手,根据参考资料回答用户问题"),
        ("user", """
            【参考资料】
            参考资料1
            {one}
            参考资料2
            {two}
            参考资料3
            {three}
            用户最终问题
            {query}
        """)
    ])
    # llm回复

    agent = prompt | model
    return agent.invoke({
    "one": chunks[0].page_content,
    "two": chunks[1].page_content,
    "three": chunks[2].page_content,
    "query": question,
})

# print(query("说说健全产业健康有序发展促进机制的举措"))