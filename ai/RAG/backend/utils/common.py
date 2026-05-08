import inspect


def toolJsonSchemaOpenAIStyle(func):
        """工具的描述信息openai风格"""
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

def toolJsonSchemaAnthropicStyle(func):
    """工具的描述信息 anthropic 风格"""
    sig = inspect.signature(func)

    properties = {}
    required = []

    for name, param in sig.parameters.items():
        properties[name] = {
            "type": "string",
            "description": f"{name}参数"
        }

        # 没有默认值的参数视为必填
        if param.default is inspect.Parameter.empty:
            required.append(name)

    func.__tool_schema__ = {
        "name": func.__name__,
        "description": func.__doc__ or "",
        "input_schema": {
            "type": "object",
            "properties": properties,
            "required": required
        }
    }

    return func