from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser


load_dotenv()

model = ChatOpenAI(model="deepseek-v4-pro")

text = """
    To create a new version of a prompt, call the same push method you used initially with the same prompt name and your updated template. LangSmith will record it as a new commit and preserve prior versions.
"""

class Tran(BaseModel):
    zhongwen: str = Field(description="翻译的结果")
    len: int= Field(description="翻译结果的单词数量")

parser = PydanticOutputParser(pydantic_object=Tran)

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个翻译助手,严格按照指定的JSON格式输出结果,{format_instructions}"),
    ("user", f"将指定内容翻译问中文，需要翻译的文本为：{text}")
]).partial(format_instructions=parser.get_format_instructions())

print(parser.get_format_instructions())


translator = prompt | model | parser
print(translator.invoke({"text": text}).zhongwen)

