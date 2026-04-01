from __future__ import annotations
import json
from typing import Any, Dict, List, Optional
import aiomysql
from app.db.session import get_pool


async def ensure_orchestration_table() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_orchestrations (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(128) NOT NULL,
                    description TEXT NULL,
                    graph_json LONGTEXT NOT NULL,
                    created_by BIGINT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )


async def create_flow(name: str, description: Optional[str], graph: Dict[str, Any], created_by: int) -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO chat_orchestrations(name, description, graph_json, created_by)
                VALUES(%s, %s, %s, %s)
                """,
                (name, description, json.dumps(graph, ensure_ascii=False), created_by),
            )
            return int(cur.lastrowid or 0)


async def update_flow(flow_id: int, patch: Dict[str, Any]) -> bool:
    sets: List[str] = []
    args: List[Any] = []
    if "name" in patch and patch["name"] is not None:
        sets.append("name=%s")
        args.append(patch["name"])
    if "description" in patch:
        sets.append("description=%s")
        args.append(patch.get("description"))
    if "graph" in patch and patch["graph"] is not None:
        sets.append("graph_json=%s")
        args.append(json.dumps(patch["graph"], ensure_ascii=False))
    if not sets:
        return False
    args.append(flow_id)
    sql = f"UPDATE chat_orchestrations SET {', '.join(sets)} WHERE id=%s"
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, tuple(args))
            return cur.rowcount > 0


async def get_flow(flow_id: int) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM chat_orchestrations WHERE id=%s LIMIT 1", (flow_id,))
            row = await cur.fetchone()
    if not row:
        return None
    row["graph"] = json.loads(row.get("graph_json") or "{}")
    return row


async def list_flows() -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                "SELECT id, name, description, created_by, created_at, updated_at FROM chat_orchestrations ORDER BY updated_at DESC"
            )
            rows = await cur.fetchall()
            return list(rows)


async def delete_flow(flow_id: int) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute("DELETE FROM chat_orchestrations WHERE id=%s", (flow_id,))
            return cur.rowcount > 0

