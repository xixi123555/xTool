from __future__ import annotations
import math
from typing import Dict, List, Optional, Sequence
import aiomysql
from app.db.session import get_pool


def _normalize(vec: List[float]) -> List[float]:
    if not vec:
        return []
    length = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / length for v in vec]


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return float(sum(x * y for x, y in zip(_normalize(a), _normalize(b))))


async def ensure_vector_tables() -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                CREATE TABLE IF NOT EXISTS kb_documents (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    room_id VARCHAR(64) NOT NULL DEFAULT 'public',
                    source_type VARCHAR(32) NOT NULL,
                    source_id VARCHAR(128) NULL,
                    content_text LONGTEXT NOT NULL,
                    metadata_json JSON NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uniq_source (source_type, source_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )
            await cur.execute(
                """
                CREATE TABLE IF NOT EXISTS kb_vectors (
                    doc_id BIGINT PRIMARY KEY,
                    vector_json LONGTEXT NOT NULL,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_kb_vectors_doc FOREIGN KEY (doc_id) REFERENCES kb_documents(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            )


async def upsert_document(
    room_id: str,
    source_type: str,
    source_id: Optional[str],
    content_text: str,
    metadata_json: Optional[str],
) -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO kb_documents(room_id, source_type, source_id, content_text, metadata_json)
                VALUES(%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    room_id=VALUES(room_id),
                    content_text=VALUES(content_text),
                    metadata_json=VALUES(metadata_json)
                """,
                (room_id, source_type, source_id, content_text, metadata_json),
            )
            if cur.lastrowid:
                return int(cur.lastrowid)
            await cur.execute(
                "SELECT id FROM kb_documents WHERE source_type=%s AND source_id=%s LIMIT 1",
                (source_type, source_id),
            )
            row = await cur.fetchone()
            return int(row[0]) if row else 0


async def upsert_vector(doc_id: int, vector_json: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO kb_vectors(doc_id, vector_json)
                VALUES(%s, %s)
                ON DUPLICATE KEY UPDATE vector_json=VALUES(vector_json)
                """,
                (doc_id, vector_json),
            )


async def list_candidates(room_id: str, limit: int = 30) -> List[Dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """
                SELECT d.id, d.room_id, d.source_type, d.source_id, d.content_text, d.metadata_json, v.vector_json
                FROM kb_documents d
                LEFT JOIN kb_vectors v ON v.doc_id = d.id
                WHERE d.room_id = %s OR d.room_id = 'public'
                ORDER BY d.updated_at DESC
                LIMIT %s
                """,
                (room_id, int(limit)),
            )
            rows = await cur.fetchall()
            return list(rows)


async def search_candidates_by_keywords(
    room_id: str,
    keywords: Sequence[str],
    limit: int = 120,
    source_types: Optional[Sequence[str]] = None,
) -> List[Dict]:
    tokens = [str(k).strip() for k in (keywords or []) if str(k).strip()]
    if not tokens:
        return []

    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            where_parts = ["(d.room_id = %s OR d.room_id = 'public')"]
            params: List = [room_id]

            if source_types:
                st = [str(x).strip() for x in source_types if str(x).strip()]
                if st:
                    where_parts.append(f"d.source_type IN ({','.join(['%s'] * len(st))})")
                    params.extend(st)

            like_parts: List[str] = []
            for t in tokens[:10]:
                like_parts.append("d.content_text LIKE %s")
                params.append(f"%{t}%")
            if like_parts:
                where_parts.append(f"({' OR '.join(like_parts)})")

            sql = f"""
                SELECT d.id, d.room_id, d.source_type, d.source_id, d.content_text, d.metadata_json, v.vector_json
                FROM kb_documents d
                LEFT JOIN kb_vectors v ON v.doc_id = d.id
                WHERE {' AND '.join(where_parts)}
                ORDER BY d.updated_at DESC
                LIMIT %s
            """
            params.append(int(limit))
            await cur.execute(sql, tuple(params))
            rows = await cur.fetchall()
            return list(rows)


async def list_chat_file_documents(limit: int = 500) -> List[Dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """
                SELECT id, room_id, source_type, source_id, content_text, metadata_json
                FROM kb_documents
                WHERE source_type = 'chat_file'
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (int(limit),),
            )
            rows = await cur.fetchall()
            return list(rows)


async def get_document_by_source(source_type: str, source_id: str) -> Optional[Dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(
                """
                SELECT id, room_id, source_type, source_id, content_text, metadata_json, created_at, updated_at
                FROM kb_documents
                WHERE source_type = %s AND source_id = %s
                LIMIT 1
                """,
                (source_type, source_id),
            )
            row = await cur.fetchone()
            return dict(row) if row else None


async def delete_documents_by_source_prefix(source_type: str, source_prefix: str) -> int:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                DELETE FROM kb_documents
                WHERE source_type = %s AND source_id LIKE %s
                """,
                (source_type, f"{source_prefix}%"),
            )
            return int(cur.rowcount or 0)
