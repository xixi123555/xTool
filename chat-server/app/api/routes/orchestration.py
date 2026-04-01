from __future__ import annotations
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from app.core.security import authenticate_bearer
from app.schemas.chat import ChatUser
from app.schemas.orchestration import (
    ExecuteOrchestrationRequest,
    SaveOrchestrationRequest,
    UpdateOrchestrationRequest,
)
from app.services.orchestration_service import (
    create_orchestration,
    execute_orchestration,
    get_orchestration,
    list_orchestrations,
    remove_orchestration,
    update_orchestration,
)


router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])


@router.get("")
async def list_flows(user: ChatUser = Depends(authenticate_bearer)):
    del user
    return {"success": True, "items": await list_orchestrations()}


@router.get("/{flow_id}")
async def get_flow(flow_id: int, user: ChatUser = Depends(authenticate_bearer)):
    del user
    flow = await get_orchestration(flow_id)
    if not flow:
        return JSONResponse(status_code=404, content={"error": "编排方案不存在"})
    return {"success": True, "item": flow}


@router.post("")
async def create_flow(body: SaveOrchestrationRequest, user: ChatUser = Depends(authenticate_bearer)):
    flow_id = await create_orchestration(
        name=body.name, description=body.description or "", graph=body.graph.model_dump(), created_by=user.id
    )
    return {"success": True, "id": flow_id}


@router.put("/{flow_id}")
async def update_flow(
    flow_id: int, body: UpdateOrchestrationRequest, user: ChatUser = Depends(authenticate_bearer)
):
    del user
    ok = await update_orchestration(
        flow_id,
        {
            "name": body.name,
            "description": body.description,
            "graph": body.graph.model_dump() if body.graph else None,
        },
    )
    if not ok:
        return JSONResponse(status_code=404, content={"error": "编排方案不存在或未发生变更"})
    return {"success": True}


@router.delete("/{flow_id}")
async def delete_flow(flow_id: int, user: ChatUser = Depends(authenticate_bearer)):
    del user
    ok = await remove_orchestration(flow_id)
    if not ok:
        return JSONResponse(status_code=404, content={"error": "编排方案不存在"})
    return {"success": True}


@router.post("/{flow_id}/execute")
async def execute_flow(
    flow_id: int, body: ExecuteOrchestrationRequest, user: ChatUser = Depends(authenticate_bearer)
):
    del user
    try:
        result = await execute_orchestration(
            flow_id=flow_id,
            input_text=body.input_text,
            room_id=body.room_id,
        )
        return {"success": True, "result": result}
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"error": str(exc)})
    except Exception:
        return JSONResponse(status_code=500, content={"error": "执行编排失败"})

