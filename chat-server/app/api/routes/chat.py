from __future__ import annotations
import os
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import JSONResponse
from app.core.security import authenticate_bearer
from app.core.settings import settings
from pydantic import BaseModel
from app.schemas.chat import AgentChatRequest, ChatUser, SendMessageRequest
from app.services.chat_service import fetch_history, send_agent_reply, send_message, send_rich_message
from app.realtime.socket_server import sio
from app.services.knowledge_base_service import (
    ingest_uploaded_file,
    rebuild_uploaded_files_kb,
    upsert_knowledge_document,
)


router = APIRouter(prefix="/api/chat", tags=["chat"])


class KbIngestTextRequest(BaseModel):
    text: str
    room_id: Optional[str] = None
    title: Optional[str] = None


class KbIngestFileRequest(BaseModel):
    url: str
    name: str
    mime_type: str
    size: int
    room_id: Optional[str] = None


class KbRebuildRequest(BaseModel):
    limit: int = 500


@router.get("/messages")
async def get_chat_messages(
    room_id: Optional[str] = "public",
    limit: int = 50,
    before_id: Optional[int] = None,
    all_rooms: Optional[str] = None,
    user: ChatUser = Depends(authenticate_bearer),
):
    del user
    all_rooms_flag = str(all_rooms or "").lower() in ("1", "true")
    messages = await fetch_history(
        room_id=room_id,
        limit=limit,
        before_id=before_id,
        all_rooms=all_rooms_flag or room_id == "__all__",
    )
    return {"success": True, "messages": [m.model_dump(mode="json") for m in messages]}


@router.post("/send")
async def post_chat_send(
    body: SendMessageRequest,
    user: ChatUser = Depends(authenticate_bearer),
):
    text = (body.text or "").strip()
    parts = body.parts or []
    room_id = body.room_id or settings.default_room
    if not text and len(parts) == 0:
        return JSONResponse(status_code=400, content={"error": "消息内容不能为空"})

    try:
        if parts:
            msg = await send_rich_message(user.id, parts, room_id)
        else:
            msg = await send_message(user.id, text, room_id)
        await sio.emit("chat:new_message", msg.model_dump(mode="json"))
        return {"success": True, "message": msg.model_dump(mode="json")}
    except ValueError:
        return JSONResponse(status_code=400, content={"error": "消息内容不能为空"})
    except Exception:
        return JSONResponse(status_code=500, content={"error": "发送失败"})


@router.post("/upload")
async def post_chat_upload(
    request: Request,
    file: UploadFile = File(...),
    user: ChatUser = Depends(authenticate_bearer),
):
    del user
    raw_name = file.filename or "file"
    ext = os.path.splitext(raw_name)[1]
    filename = f"{uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, filename)
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    host = request.headers.get("host") or f"localhost:{settings.port}"
    base_url = settings.public_base_url or f"{request.url.scheme}://{host}"
    url = f"{base_url}/uploads/chat/{filename}"
    return {
        "success": True,
        "file": {
            "url": url,
            "name": raw_name,
            "size": len(content),
            "mime_type": file.content_type or "application/octet-stream",
        },
    }



@router.post("/agent/send")
async def post_chat_agent_send(
    body: AgentChatRequest,
    user: ChatUser = Depends(authenticate_bearer),
):
    text = (body.text or "").strip()
    if not text:
        return JSONResponse(status_code=400, content={"error": "消息内容不能为空"})
    try:
        msg = await send_agent_reply(
            requester_user_id=user.id,
            question=text,
            room_id=body.room_id or settings.default_room,
            include_sources=body.include_sources,
        )
        await sio.emit("chat:new_message", msg.model_dump(mode="json"))
        return {"success": True, "message": msg.model_dump(mode="json")}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "机器人回复失败"})


@router.post("/kb/ingest-text")
async def post_kb_ingest_text(
    body: KbIngestTextRequest,
    user: ChatUser = Depends(authenticate_bearer),
):
    text = (body.text or "").strip()
    if not text:
        return JSONResponse(status_code=400, content={"error": "文本不能为空"})
    try:
        room_id = body.room_id or settings.default_room
        doc_id = await upsert_knowledge_document(
            room_id=room_id,
            source_type="manual_text",
            source_id=f"user:{user.id}:{uuid4()}",
            content_text=text,
            metadata={"title": body.title or "", "created_by": user.id},
        )
        return {"success": True, "doc_id": doc_id}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "文本入库失败"})


@router.post("/kb/ingest-file")
async def post_kb_ingest_file(
    body: KbIngestFileRequest,
    user: ChatUser = Depends(authenticate_bearer),
):
    del user
    if not body.url:
        return JSONResponse(status_code=400, content={"error": "文件地址不能为空"})
    try:
        room_id = body.room_id or settings.default_room
        local_path = os.path.join(settings.upload_dir, body.url.rstrip("/").split("/")[-1]) if body.url else None
        doc_id = await ingest_uploaded_file(
            room_id=room_id,
            file_url=body.url,
            file_name=body.name,
            mime_type=body.mime_type,
            file_size=body.size,
            local_path=local_path if local_path and os.path.exists(local_path) else None,
        )
        return {"success": True, "doc_id": doc_id}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "文件入库失败"})


@router.post("/kb/rebuild-files")
async def post_kb_rebuild_files(
    body: KbRebuildRequest,
    user: ChatUser = Depends(authenticate_bearer),
):
    del user
    try:
        result = await rebuild_uploaded_files_kb(limit=body.limit)
        return {"success": True, "result": result}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "知识库重建失败"})
