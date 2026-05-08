from common import toolJsonSchemaOpenAIStyle
from llm import llm

class Tools:
    def __init__(self):
        self.tools = {}
    
    def rigister(self, func):
        """注册工具"""
        self.tools[func.__name__] = func

@toolJsonSchemaOpenAIStyle
def search_news(prompt):
    """获取新闻内容"""
    return f"""
        湖南浏阳 “5・4” 爆炸事故：国务院挂牌督办，全省烟花企业停产事故已致26 人遇难、61 人受伤，搜救基本完成。国务院成立调查组，按 “四不放过” 原则彻查原因、追责问责；即日起湖南所有烟花爆竹企业全面停产整顿。
伊朗外长阿拉格齐访华5 月 6 日，伊朗外长阿拉格齐应邀访华，与王毅外长会谈，聚焦中东局势、双边合作与地区热点问题，中方坚持劝和促谈，推动地区稳定。
央行投放 3000 亿元流动性为维持银行体系流动性合理充裕，央行今日开展3000 亿元 3 个月期买断式逆回购操作。
五一假期收官：人流、票房创新高假期跨区域人员流动量超 15 亿人次，日均超 3 亿，同比增 4%；五一档总票房7.56 亿元。
中方反对美方升级对古巴制裁外交部敦促美方立即终止对古巴的封锁与制裁，坚决反对干涉古巴内政。
    """

@toolJsonSchemaOpenAIStyle
def summarize(prompt):
    """总结新闻"""
    return f"""
        ### 国内要闻
        1. **湖南浏阳“5·4”爆炸事故：国务院挂牌督办，全省烟花企业停产**
        事故已致**26人遇难、61人受伤**，搜救基本完成。国务院成立调查组，按“四不放过”原则彻查原因、追责问责；即日起湖南所有烟花爆竹企业**全面停产整顿**。

        2. **伊朗外长阿拉格齐访华**
        5月6日，伊朗外长阿拉格齐应邀访华，与王毅外长会谈，聚焦**中东局势、双边合作**与地区热点问题，中方坚持劝和促谈，推动地区稳定。

        3. **央行投放3000亿元流动性**
        为维持银行体系流动性合理充裕，央行今日开展**3000亿元3个月期买断式逆回购**操作。

        4. **五一假期收官：人流、票房创新高**
        假期跨区域人员流动量**超15亿人次**，日均超3亿，同比增4%；五一档总票房**7.56亿元**。

        5. **中方反对美方升级对古巴制裁**
        外交部敦促美方立即终止对古巴的封锁与制裁，坚决反对干涉古巴内政。

    """

@toolJsonSchemaOpenAIStyle
def generateReport(text):
    """输出成文档"""
    with open("aa.md", 'a', encoding='utf-8') as f:
        f.write(text)
    return "导出完成！"

llm.rigister(search_news)
llm.rigister(summarize)
llm.rigister(generateReport)
mm = llm.getToolLLMAnswerPlanner("帮我查询并总结新闻，然后生成报告",[tool_schema.__tool_schema__ for tool_schema in llm._tools.values()])
print('-----------mmmmmm-----------')
print(mm)
# aa = llm.getToolLLMAnswer("帮我查询并总结新闻，然后生成报告",[tool_schema.__tool_schema__ for tool_schema in llm._tools.values()])
# print("-----------aaaa------------")
# print(aa)
# bb = llm.getCallToolLLMAnswer(aa)
# print("-----------bbbb------------")
# print(bb)
# cc = llm.getCallToolLLMAnswer(bb)
# print("-----------ccc------------")
# print(cc)
# dd = llm.getCallToolLLMAnswer(cc)
# print("-----------ddddd------------")
# print(dd)
