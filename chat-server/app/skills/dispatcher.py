from __future__ import annotations
from typing import Any, Dict, List
from langgraph.graph import StateGraph, END
from .registry import SkillRegistry
from .base import SkillContext


class SkillDispatcher:
    def __init__(self, registry: SkillRegistry) -> None:
        self.registry = registry

    async def dispatch(self, context: SkillContext) -> List[Dict[str, Any]]:
        # 默认不启用智能体流程，仅预留能力
        return []

    def build_graph(self):
        graph = StateGraph(dict)
        graph.add_node("start", lambda state: state)
        graph.set_entry_point("start")
        graph.add_edge("start", END)
        return graph.compile()
