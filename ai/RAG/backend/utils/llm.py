from openai import OpenAI
from typing import TypedDict, NotRequired
import json

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
        self._tools = {}
        self.initModel(apiKey = self._config["apiKey"], baseUrl = self._config["url"])

    def initModel(self, apiKey: str, baseUrl: str):
        self._client = OpenAI(api_key=apiKey, base_url=baseUrl)

    def rigister(self, func):
        """注册工具"""
        self._tools[func.__name__] = func
    
    def execute(self, toolCall):
        """ 执行工具 """
        arg = json.loads(toolCall.function.arguments)
        return self._tools[toolCall.function.name](**arg)
    
    def getLLMAnswaerForMessages(self, messages):
        resq = self._client.chat.completions.create(
            model = self._config["modelName"],
            messages = self._messages,
            stream = False,
            tools=[tool_schema.__tool_schema__ for tool_schema in self._tools.values()],
            tool_choice="auto",
            reasoning_effort=None
        )
        return resq.choices[0].message

    def getLLMAnswer(self, query: str):
        """获取大模型回复"""
        self.appendContext({"role": "user", "content": query})
        resq = self._client.chat.completions.create(
            model = self._config["modelName"],
            messages = self._messages,
            stream = False,
            reasoning_effort=None
        )
        return resq.choices[0].message.content
    
    def getLLMStreamAnswer(self, query: str):
        """获取大模型回复-流式"""
        self.appendContext({"role": "user", "content": query})
        resq = self._client.chat.completions.create(model=self._config["modelName"],messages=self._messages, stream=True)
        return resq

    def getToolLLMAnswer(self, query: str, tools: Any):
        """获取大模型工具调用回复"""
        self.appendContext({"role": "user", "content": query})
        resq = self._client.chat.completions.create(
            model=self._config["modelName"],
            messages=self._messages,
            stream=False,
            tools=tools,
            tool_choice="auto",
            reasoning_effort=None
        )
        return resq.choices[0].message

    def getToolLLMAnswerPlanner(self, query: str, tools: Any):
        """获取大模型工具调用回复"""
        planner_prompt = """
            你是一个任务规划器（Task Planner）。

            你的职责是：
            1. 理解用户目标
            2. 将复杂任务拆分为多个可执行步骤
            3. 为每个步骤选择最合适的工具
            4. 明确步骤之间的依赖关系
            5. 输出结构化执行计划

            注意：
            - 你只负责规划，不负责执行
            - 不要生成最终答案
            - 不要假装工具已经执行成功
            - 每一步必须足够清晰
            - 如果某一步依赖前一步结果，必须使用 depends_on
            - 能并行的步骤不要强制串行

            你可以使用以下工具：

            1. search_news
            功能：
            搜索最新新闻

            参数：
            {
            "keyword": "搜索关键词",
            "date": "日期"
            }

            2. summarize
            功能：
            总结文本内容

            参数：
            {
            "text": "待总结文本"
            }

            3. generateReport
            功能：
            根据摘要生成最终报告

            参数：
            {
            "summary": "摘要内容",
            "format": "markdown/pdf/docx"
            }

            输出格式必须是 JSON：

            {
            "steps": [
                {
                "id": 1,
                "task": "步骤描述",
                "tool": "工具名",
                "args": {},
                "depends_on": []
                }
            ]
            }
        """
        self.appendContext({"role": "system", "content": planner_prompt})
        self.appendContext({"role": "user", "content": query})
        resq = self._client.chat.completions.create(
            model=self._config["modelName"],
            messages=self._messages,
            stream=False,
            tools=tools,
            tool_choice="auto",
            reasoning_effort=None
        )
        return resq.choices[0].message.content

    def getCallToolLLMAnswer(self, message):
        """获取调用工具后的大模型回复"""
        toolCalls = message.tool_calls
        reasoning_content = message.reasoning_content
        self.appendContext({
            "role": "assistant",
            "content": None,
            "tool_calls": toolCalls,
            "reasoning_content": reasoning_content
        })
        for toolCall in toolCalls:
            result = self.execute(toolCall)
            self.appendContext({
                "role": "tool",
                "tool_call_id": toolCall.id,
                "content": result,
                "reasoning_content": reasoning_content,
            })
        return self.getLLMAnswaerForMessages(self._messages)


    def changeModel(self, modelName: str, apiKey: str, baseUrl: str):
        """变更模型"""
        self._messages = []
        self._tools = {}
        self._config = { **self._config, "modelName": modelName }
        self.initModel(apiKey = apiKey, baseUrl = baseUrl)
    
    def appendContext(self, messageStruct):
        """添加上下文"""
        self._messages.append(messageStruct)

llm = LLM()