from __future__ import annotations
import hashlib
import jwt
import aiomysql
from typing import Optional
from fastapi import Header, HTTPException
from app.core.settings import settings
from app.schemas.chat import ChatUser
from app.db.session import get_pool


async def _fetch_user_by_id(user_id: int) -> Optional[ChatUser]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                "SELECT id, username, email, avatar, user_type FROM users WHERE id = %s",
                (user_id,),
            )
            row = await cur.fetchone()
            return ChatUser(**row) if row else None


async def _fetch_user_by_mcp_key(token: str) -> Optional[ChatUser]:
    key_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """
                SELECT u.id, u.username, u.email, u.avatar, u.user_type
                FROM mcp_keys k
                INNER JOIN users u ON u.id = k.user_id
                WHERE k.key_hash = %s
                LIMIT 1
                """,
                (key_hash,),
            )
            row = await cur.fetchone()
            return ChatUser(**row) if row else None


async def authenticate_bearer(authorization: Optional[str] = Header(default=None)) -> ChatUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未提供认证令牌")
    token = authorization.replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(status_code=401, detail="无效的认证令牌")

    try:
        decoded = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = int(decoded.get("userId"))
        user = await _fetch_user_by_id(user_id)
        if user:
            return user
    except Exception:
        pass

    mcp_user = await _fetch_user_by_mcp_key(token)
    if mcp_user:
        return mcp_user
    raise HTTPException(status_code=401, detail="无效的认证令牌")


async def authenticate_token(token: str) -> Optional[ChatUser]:
    if not token:
        return None
    try:
        decoded = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user = await _fetch_user_by_id(int(decoded.get("userId")))
        if user:
            return user
    except Exception:
        pass
    return await _fetch_user_by_mcp_key(token)
