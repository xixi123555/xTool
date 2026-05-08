# from langsmith import Client
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

# client = Client()
load_dotenv()

model = ChatOpenAI(model="deepseek-v4-pro")
prompt = ChatPromptTemplate([
    ("system", "你是一个助手"),
    ("user", "{question}"),
])
print(prompt.invoke({"question", "你是谁"}))
chain = prompt | model
print(chain.invoke({"question": "你的知识截止日期"}))