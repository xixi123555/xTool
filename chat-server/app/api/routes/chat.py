from __future__ import annotations
import os
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import JSONResponse
from app.core.security import authenticate_bearer
from app.core.settings import settings
from app.schemas.chat import ChatUser, SendMessageRequest
from app.services.chat_service import fetch_history, send_message, send_rich_message
from app.realtime.socket_server import sio


router = APIRouter(prefix="/api/chat", tags=["chat"])


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
