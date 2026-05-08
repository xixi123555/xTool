from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

MODEL_NAME = "deepseek-v4-pro"
load_dotenv()

model = ChatOpenAI(model = MODEL_NAME)

print(model.invoke("你是谁？"))