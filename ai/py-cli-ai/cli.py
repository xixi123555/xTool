from openai import OpenAI
import json
import copy
import textwrap
import httpx
import requests
import inspect

# 1. 定义日志钩子函数
def log_request_details(response: httpx.Response):
    request = response.request
    print(f"--- Request: {request.method} {request.url} ---")
    
    # 打印 Header (可选：脱敏处理)
    for key, value in request.headers.items():
        if key.lower() == "authorization":
            value = "Bearer sk-***"
        print(f"  Header {key}: {value}")
    
    # 打印请求体 (Body)
    if request.content:
        print("  Request Body:")
        try:
            body_json = json.loads(request.content)
            print(textwrap.indent(json.dumps(body_json, indent=2), "    "))
        except:
            print(textwrap.indent(request.content.decode(), "    "))
            
    print(f"--- Response: {response.status_code} ---")

# 2. 创建带有日志钩子的 HTTPX 客户端
httpx_client = httpx.Client(
    event_hooks={
        "response": [log_request_details]  # 在收到响应时触发钩子
    }
)


client = OpenAI(api_key='sk-a971f9950cab4a1b8adacd3ac33998df', base_url="https://api.deepseek.com", http_client=httpx_client)

systemPrompt = """
你是一个助手，可以决定是否调用工具。

可用工具：
1. getWeather(city): 查询城市天气

规则：
- 如果用户问天气，返回JSON：
  {"action": "getWeather", "input": "城市名"}
- 否则返回：
  {"action": "none", "output": "你的回答"}

只允许返回JSON，不要解释
"""

weatherUrl = 'https://uapis.cn/api/v1/misc/weather'

def toolJsonSchema(func):
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
@toolJsonSchema
def test(a):
    return a * a
def getllmAnswer(llmq):
    resq = client.chat.completions.create(model="deepseek-chat",messages=llmq, stream=False)
    return resq.choices[0].message.content

def getToolllmAnswer(llmq, tools):
    resq = client.chat.completions.create(model="deepseek-v4-pro",messages=llmq, stream=False, tools=tools, tool_choice="auto")
    return resq.choices[0].message.tool_calls

@toolJsonSchema
def getWeather1(city):
    """获取某个城市的天气"""
    url = f'{weatherUrl}?city={city}'
    response = requests.get(url=url).json()
    return json.dumps(response, ensure_ascii=False, indent=2)

class Register:
    def __init__(self):
        self._tools = {}
    def inject(self, func):
        self._tools[func.__name__] = func
    def execute(self, tool_call):
        arg = json.loads(tool_call.function.arguments)
        return self._tools[tool_call.function.name](**arg)

def main1():
    while True:
        register = Register()
        register.inject(getWeather1)
        qq = input("我：")
        ll = [{"role": "user", "content": qq}]
        # print(ll, [getWeather1.__tool_schema__])
        # print(getToolllmAnswer(ll, [getWeather1.__tool_schema__]))
        tool_calls = getToolllmAnswer(ll, [getWeather1.__tool_schema__])
        for tool_call in tool_calls:
            weatherResult = register.execute(tool_call)
            ll.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [tool_call]
            })
            ll.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": weatherResult
            })
            print(getllmAnswer(ll))

main1()

def getllmStreamAnswer(llmq):
    resq = client.chat.completions.create(model="deepseek-v4-flash",messages=llmq, stream=True)
    return resq

def printSteamAnswer(stream):
    allcontent = ''
    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            allcontent += content
    return allcontent

def parseJSONStr(str):
    return json.loads(str) or {}

def summaryMemory(chatList):
    chatList.append({"role": "user", "content": "将以上聊天内容生成一个摘要"})
    result = parseJSONStr(printSteamAnswer(getllmStreamAnswer(chatList))) or {}
    print('xxxxxx:', result['output'])
    return result['output']


def getWeather(city):
    url = f'{weatherUrl}?city={city}'
    response = requests.get(url=url).json()
    weatherPrompt = f"""
    【用户问题】
    {currentQ}

    【工具返回结果】
    {json.dumps(response, ensure_ascii=False, indent=2)}

    【要求】
    - 用自然语言回答
    - 不要编造信息
    - 信息要简洁清晰
    """
    weatherLLMq = [{"role": "system", "content": "你是一个天气助手"}]
    weatherLLMq.append({"role": "user", "content": weatherPrompt})
    stream = getllmStreamAnswer(weatherLLMq)
    aa = printSteamAnswer(stream)
    return aa



defaultLLMq = [{"role": "system", "content": systemPrompt}]
llmq = copy.deepcopy(defaultLLMq)
currentQ = ''
def main():
    global llmq
    while True:
        q = input('问题：')
        currentQ = 1
        llmq.append({"role": "user", "content": q})
        if q == '退出':
            break
        if q == '你是什么模型':
            print(printSteamAnswer(getllmStreamAnswer([{"role": "user", "content": "你是什么模型"}])))
            continue
        llmAnswer = printSteamAnswer(getllmStreamAnswer(llmq))
        llmq.append({"role": "assistant", "content": llmAnswer})
        print('返回结果：', llmAnswer)
        result = parseJSONStr(llmAnswer) or {}
        if result["action"] == "getWeather":
            print(getWeather(result["input"]))
        else:
            print(result['output'])
        dialogList = [x for x in llmq if x["role"] == "user"]
        if len(dialogList) > 2:
           historyList = llmq
           llmq = copy.deepcopy(defaultLLMq)
           llmq.append({"role": "system", "content": summaryMemory(historyList)})
# main()
