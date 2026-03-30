from __future__ import annotations
from typing import Optional, List
from app.core.settings import settings
from app.schemas.chat import ChatMessagePart, ChatMessage
from app.domain.chat_protocol import build_text_part, normalize_parts
from app.repositories.chat_repository import create_message, get_messages
from app.skills.registry import SkillRegistry
from app.skills.dispatcher import SkillDispatcher
from app.skills.base import SkillContext


registry = SkillRegistry()
dispatcher = SkillDispatcher(registry)


async def send_message(user_id: int, text: str, room_id: Optional[str] = None) -> ChatMessage:
    room = room_id or settings.default_room
    part = build_text_part(text)
    return await create_message(room, user_id, [part])


async def send_rich_message(
    user_id: int, parts: List[ChatMessagePart], room_id: Optional[str] = None
) -> ChatMessage:
    room = room_id or settings.default_room
    normalized = normalize_parts(parts)
    if not normalized:
        raise ValueError("消息内容不能为空")

    msg = await create_message(room, user_id, normalized)
    context = SkillContext(
        user_id=user_id,
        room_id=msg.room_id,
        message=" ".join(
            [p.payload.text for p in normalized if p.type == "text" and p.payload and p.payload.text]
        )
        or None,
        metadata={"message_id": msg.id},
    )
    await dispatcher.dispatch(context)
    return msg


async def fetch_history(
    room_id: Optional[str],
    limit: Optional[int] = 50,
    before_id: Optional[int] = None,
    all_rooms: bool = False,
) -> List[ChatMessage]:
    room = room_id or settings.default_room
    return await get_messages(room, limit=limit, before_id=before_id, all_rooms=all_rooms)
