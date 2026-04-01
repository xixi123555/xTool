from __future__ import annotations
from typing import Any, Dict, List, Optional
from app.core.settings import settings
from app.repositories.orchestration_repository import (
    create_flow,
    delete_flow,
    get_flow,
    list_flows,
    update_flow,
)
from app.services.knowledge_base_service import query_knowledge


async def create_orchestration(name: str, description: str, graph: Dict[str, Any], created_by: int) -> int:
    return await create_flow(name=name, description=description, graph=graph, created_by=created_by)


async def update_orchestration(flow_id: int, patch: Dict[str, Any]) -> bool:
    return await update_flow(flow_id, patch)


async def get_orchestration(flow_id: int) -> Optional[Dict[str, Any]]:
    return await get_flow(flow_id)


async def list_orchestrations() -> List[Dict[str, Any]]:
    return await list_flows()


async def remove_orchestration(flow_id: int) -> bool:
    return await delete_flow(flow_id)


async def execute_orchestration(
    flow_id: int, input_text: str, room_id: Optional[str] = None
) -> Dict[str, Any]:
    flow = await get_flow(flow_id)
    if not flow:
        raise ValueError("编排方案不存在")

    room = room_id or settings.default_room
    context, sources = await query_knowledge(input_text, room_id=room)
    output_text = (
        f"执行流程[{flow.get('name')}]完成。\n\n输入：{input_text}\n\n"
        f"检索上下文：\n{context[:1000] if context else '未命中知识库'}"
    )
    return {
        "flow_id": flow_id,
        "flow_name": flow.get("name"),
        "room_id": room,
        "input_text": input_text,
        "output_text": output_text,
        "sources": [s.model_dump() for s in sources],
    }

