from __future__ import annotations
from typing import Any, Dict, Optional
import socketio
from app.core.security import authenticate_token
from app.core.settings import settings
from app.schemas.chat import ChatMessagePart
from app.services.chat_service import send_agent_reply, send_message, send_rich_message


sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


def _online_count() -> int:
    room_members = sio.manager.rooms.get("/", {}).get(settings.default_room, set())
    return len(room_members)


async def _broadcast_online_count() -> None:
    await sio.emit("chat:online_count", {"count": _online_count()}, room=settings.default_room)


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict[str, Any]]):
    token = ""
    if auth and isinstance(auth, dict):
        token = str(auth.get("token") or "")
    if not token:
        auth_header = environ.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()

    user = await authenticate_token(token)
    if not user:
        return False

    await sio.save_session(sid, {"user": user.model_dump()})
    await sio.enter_room(sid, settings.default_room)
    await _broadcast_online_count()
    return True


@sio.event
async def disconnect(sid: str):
    await _broadcast_online_count()


@sio.on("chat:send")
async def on_chat_send(sid: str, payload: Dict[str, Any]):
    session = await sio.get_session(sid)
    user_data = session.get("user", {})
    user_id = int(user_data.get("id", 0))
    if user_id <= 0:
        await sio.emit("chat:error", {"message": "发送失败"}, to=sid)
        return

    try:
        room_id = payload.get("roomId") or settings.default_room
        text = (payload.get("text") or "").strip()
        raw_parts = payload.get("parts") or []
        to_agent = bool(payload.get("toAgent") or payload.get("to_agent"))
        parts = [ChatMessagePart(**p) for p in raw_parts] if isinstance(raw_parts, list) else []

        if to_agent and text:
            msg = await send_agent_reply(
                requester_user_id=user_id,
                question=text,
                room_id=room_id,
                include_sources=True,
            )
        elif parts:
            msg = await send_rich_message(user_id=user_id, parts=parts, room_id=room_id)
        elif text:
            msg = await send_message(user_id=user_id, text=text, room_id=room_id)
        else:
            return
        await sio.emit("chat:new_message", msg.model_dump(mode="json"))
    except Exception:
        await sio.emit("chat:error", {"message": "发送失败"}, to=sid)
