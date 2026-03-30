from __future__ import annotations
import json
import aiomysql
from typing import Optional, List, Dict, Any
from app.db.session import get_pool
from app.schemas.chat import ChatMessage, ChatMessagePart
from app.domain.chat_protocol import normalize_parts


def _clamp_limit(limit: Optional[int]) -> int:
    if not limit:
        return 50
    n = int(limit)
    if n < 1:
        return 50
    return min(n, 200)


def _format_row(row: Dict[str, Any]) -> ChatMessage:
    raw = row.get("content_json")
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            raw = [{"type": "text", "text": str(raw)}]
    parts = [ChatMessagePart(**item) for item in (raw or [])]
    return ChatMessage(
        id=row["id"],
        room_id=row["room_id"],
        user_id=row["user_id"],
        content_json=normalize_parts(parts),
        created_at=row.get("created_at"),
        username=row.get("username") or "未知",
        avatar=row.get("avatar"),
    )


async def get_by_id(message_id: int) -> Optional[ChatMessage]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """
                SELECT m.id, m.room_id, m.user_id, m.content_json, m.created_at, u.username, u.avatar
                FROM chat_messages m
                LEFT JOIN users u ON m.user_id = u.id
                WHERE m.id = %s
                """,
                (message_id,),
            )
            row = await cur.fetchone()
            return _format_row(row) if row else None


async def create_message(room_id: str, user_id: int, parts: List[ChatMessagePart]) -> ChatMessage:
    payload = [p.model_dump(exclude_none=True) for p in parts]
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO chat_messages (room_id, user_id, content_json) VALUES (%s, %s, %s)",
                (room_id, user_id, json.dumps(payload, ensure_ascii=False)),
            )
            message_id = cur.lastrowid
    msg = await get_by_id(int(message_id))
    if not msg:
        raise RuntimeError("消息创建后查询失败")
    return msg


async def get_messages(
    room_id: str,
    limit: Optional[int] = 50,
    before_id: Optional[int] = None,
    all_rooms: bool = False,
) -> List[ChatMessage]:
    lim = _clamp_limit(limit)
    where = "WHERE 1=1" if all_rooms else "WHERE m.room_id = %s"
    params: List[object] = [] if all_rooms else [room_id]
    if before_id is not None:
        where += " AND m.id < %s"
        params.append(int(before_id))
    sql = f"""
        SELECT m.id, m.room_id, m.user_id, m.content_json, m.created_at, u.username, u.avatar
        FROM chat_messages m
        LEFT JOIN users u ON m.user_id = u.id
        {where}
        ORDER BY m.id DESC
        LIMIT {lim}
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, tuple(params))
            rows = await cur.fetchall()
    rows = list(rows)[::-1]
    return [_format_row(r) for r in rows]
