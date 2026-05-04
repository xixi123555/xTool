from openai import OpenAI
from typing import TypedDict, NotRequired
import inspect

class Config(TypedDict):
    apiKey: NotRequired(str)
    url: NotRequired(str)
    modelName: NotRequired(str)

defaultConfig: Config = {
    "apiKey": "sk-a971f9950cab4a1b8adacd3ac33998df",
    "url": "https://api.deepseek.com",
    "modelName": "deepseek-v4-pro"
}

class LLM:
    def __init__(self, config: Config | None = defaultConfig):
        self._config = { **defaultConfig, **config }
        self._messages = []
        self.initModel(apiKey = self._config["apiKey"], baseUrl = self._config["url"])

    def initModel(self, apiKey: str, baseUrl: str):
        self._client = OpenAI(api_key=apiKey, base_url=baseUrl)

    def getLLMAnswer(self, query: str):
        """获取大模型回复"""
        self.appendContext({"role": "user", "content": query})
        resq = self._client.chat.completions.create(model = self._config["modelName"], messages = self._messages, stream = False)
        return resq.choices[0].message.content
    
    def getLLMStreamAnswer(self, query: str):
        """获取大模型回复-流式"""
        self.appendContext({"role": "user", "content": query})
        resq = self._client.chat.completions.create(model=self._config["modelName"],messages=self._messages, stream=True)
        return resq

    def getToolLLMAnswer(self, query: str, tools: Any):
        """获取大模型工具调用回复"""

    def getCallToolLLMAnswer(self, query: str, tools: Any):
        """获取调用工具后的大模型回复"""

    def changeModel(self, modelName: str, apiKey: str, baseUrl: str):
        """变更模型"""
        self.initModel(apiKey = apiKey, baseUrl = baseUrl)
    
    def appendContext(self, messageStruct):
        """添加上下文"""
        self._messages.append(messageStruct)
    
    def toolJsonSchema(func):
        """产生工具的描述信息"""
        sin = inspect.signature(func)
        properties = {}
        require = []
        for name, param in sin.parameters.items():
            properties[name] = {
                "type": "string",
                "description": f'{name}参数'
            }
            require.append(name)
        func.__tool_schema__ = {
            "type": "function",
            "function": {
                "name": func.__name__,
                "description": func.__doc__ or "",
                "parameters": {
                    "type": "object",
                    "properties": properties,
                    "required": require
                }
            }
        }
        return func

llm = LLM()