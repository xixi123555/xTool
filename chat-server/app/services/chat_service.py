from __future__ import annotations
import json
import os
import re
from typing import Optional, List, Tuple
from urllib import request
from app.core.settings import settings
from app.schemas.chat import ChatMessagePart, ChatMessage, RagSource
from app.domain.chat_protocol import build_text_part, normalize_parts
from app.repositories.chat_repository import create_message, get_messages
from app.skills.registry import SkillRegistry
from app.skills.dispatcher import SkillDispatcher
from app.skills.base import SkillContext
from app.services.knowledge_base_service import ingest_chat_message, ingest_uploaded_file, query_knowledge


registry = SkillRegistry()
dispatcher = SkillDispatcher(registry)


async def send_message(user_id: int, text: str, room_id: Optional[str] = None) -> ChatMessage:
    room = room_id or settings.default_room
    part = build_text_part(text)
    msg = await create_message(room, user_id, [part])
    await ingest_chat_message(message_id=msg.id, room_id=msg.room_id, text=text)
    return msg


async def send_rich_message(
    user_id: int, parts: List[ChatMessagePart], room_id: Optional[str] = None
) -> ChatMessage:
    room = room_id or settings.default_room
    normalized = normalize_parts(parts)
    if not normalized:
        raise ValueError("消息内容不能为空")

    msg = await create_message(room, user_id, normalized)
    plain_text, files = _extract_indexable_content(normalized)
    if plain_text:
        await ingest_chat_message(message_id=msg.id, room_id=msg.room_id, text=plain_text)
    for f in files:
        await ingest_uploaded_file(
            room_id=msg.room_id,
            file_url=f.get("url", ""),
            file_name=f.get("name", "附件"),
            mime_type=f.get("mime_type", "application/octet-stream"),
            file_size=int(f.get("size", 0)),
            local_path=_resolve_local_upload_path(f.get("url", "")),
        )
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


def _extract_indexable_content(parts: List[ChatMessagePart]) -> Tuple[str, List[dict]]:
    texts: List[str] = []
    files: List[dict] = []
    for p in parts:
        if p.type == "text":
            t = (p.payload.text if p.payload and p.payload.text else p.text) or ""
            if t.strip():
                texts.append(t.strip())
        if p.type in ("image", "file"):
            url = ""
            name = ""
            mime_type = ""
            size = 0
            if p.payload:
                url = p.payload.url or ""
                name = p.payload.name or ""
                mime_type = p.payload.mime_type or ""
                size = p.payload.size or 0
            if not url:
                url = p.file_url or p.image_url or ""
            if not name:
                name = p.file_name or "附件"
            if not mime_type:
                mime_type = p.mime_type or "application/octet-stream"
            files.append({"url": url, "name": name, "mime_type": mime_type, "size": size})
    return " ".join(texts).strip(), files


def _mock_llm_answer(question: str, context: str) -> str:
    if context:
        return f"我基于知识库检索到以下相关内容并给出回答：\n\n{context[:1200]}\n\n问题：{question}"
    return f"我暂未从知识库中检索到高相关内容。基于当前信息，针对你的问题“{question}”，建议补充更多上下文后再查询。"


def _resolve_local_upload_path(file_url: str) -> Optional[str]:
    if not file_url:
        return None
    filename = file_url.rstrip("/").split("/")[-1]
    if not filename:
        return None
    path = os.path.join(settings.upload_dir, filename)
    return path if os.path.exists(path) else None


def _llm_answer(question: str, context: str) -> str:
    if settings.llm_provider == "mock" or not settings.llm_api_base or not settings.llm_api_key:
        return _mock_llm_answer(question, context)
    prompt = (
        "你是聊天室知识库问答助手。请仅基于给定知识库上下文回答问题。"
        "若上下文不足，请明确说无法确认并说明需要哪些补充信息。"
        "回答要简洁，并给出关键依据。\n\n"
        f"【知识库上下文】\n{context}\n\n【问题】{question}"
    )
    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": "你是严谨的企业知识库问答助手。"},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
    }
    req = request.Request(
        url=f"{settings.llm_api_base.rstrip('/')}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.llm_api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=settings.llm_timeout_seconds) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
                or _mock_llm_answer(question, context)
            )
    except Exception:
        return _mock_llm_answer(question, context)


def _extract_direct_answer(question: str, context: str) -> Optional[str]:
    q = (question or "").strip()
    c = (context or "").strip()
    if not q or not c:
        return None

    # 提取问题中的关键实体（人名/日期）
    date_tokens = re.findall(r"\d{4}年\d{1,2}月\d{1,2}日", q)
    cn_tokens = re.findall(r"[\u4e00-\u9fa5]{2,4}", q)
    ignore_parts = ("什么", "做了", "哪些", "哪天", "当天", "内容", "事项", "文档", "做啥", "做过")
    raw_name_tokens = [
        t
        for t in cn_tokens
        if not any(part in t for part in ignore_parts) and len(t) >= 2
    ]
    stop_chars = ("在", "于", "把", "将")
    name_tokens = []
    for t in raw_name_tokens:
        cleaned = t.strip()
        while len(cleaned) > 2 and cleaned.endswith(stop_chars):
            cleaned = cleaned[:-1]
        if len(cleaned) >= 2:
            name_tokens.append(cleaned)
    required_tokens = [*date_tokens, *name_tokens]

    if not required_tokens:
        return None

    # 识别问题中的“目标人名”（取首个中文词作为强约束）
    target_name = name_tokens[0] if name_tokens else ""
    target_date = date_tokens[0] if date_tokens else ""
    target_date_alt = ""
    if target_date:
        m = re.match(r"(\d{4})年(\d{1,2})月(\d{1,2})日", target_date)
        if m:
            target_date_alt = f"{m.group(1)}/{int(m.group(2))}/{int(m.group(3))}"

    lines = [line.strip() for line in c.splitlines() if line.strip()]
    # 优先同一行同时命中“姓名+日期”，避免窗口把相邻行拼成误命中
    strict_hits: List[str] = []
    if target_name and (target_date or target_date_alt):
        for line in lines:
            has_name = target_name in line
            has_date = (target_date in line) or (target_date_alt in line if target_date_alt else False)
            if has_name and has_date:
                strict_hits.append(line)
        if strict_hits:
            best_line = strict_hits[0]
            for sep in ("|", "，", ","):
                if sep in best_line:
                    cols = [x.strip() for x in best_line.split(sep) if x.strip()]
                    candidates = []
                    for col in cols:
                        if target_name in col:
                            continue
                        if target_date and target_date in col:
                            continue
                        if target_date_alt and target_date_alt in col:
                            continue
                        if re.fullmatch(r"[0-9./:-]+", col):
                            continue
                        candidates.append(col)
                    if candidates:
                        return candidates[-1]
            return best_line

    best_line = ""
    best_score = -1
    for idx, line in enumerate(lines):
        # 以“当前行+前后各一行”构建局部窗口，适配“日期和姓名不在同一列/同一行”的表格导出
        window = "\n".join(lines[max(0, idx - 1) : min(len(lines), idx + 2)])

        # 强约束：问题里有姓名/日期时，窗口必须同时包含它们；否则不参与直接抽取，避免答成别人（如雷荣）
        if target_name and target_name not in window:
            continue
        if target_date and target_date not in window and (not target_date_alt or target_date_alt not in window):
            continue

        score = 0
        for token in required_tokens:
            if token in window:
                score += 2
            elif token == target_date and target_date_alt and target_date_alt in window:
                score += 2
        # 对结构化行（常见导出格式）提高分值
        if "|" in line or "，" in line or "," in line:
            score += 1
        if score > best_score:
            best_score = score
            best_line = line

    if best_score <= 0:
        return None

    # 优先从结构化列中抽取“事项/任务”列
    for sep in ("|", "，", ","):
        if sep in best_line:
            cols = [x.strip() for x in best_line.split(sep) if x.strip()]
            # 去掉包含人名/日期的列，优先返回剩余列中的末列（通常是事项）
            candidates = []
            for col in cols:
                if any(token in col for token in required_tokens):
                    continue
                # 排除纯数字/日期类列
                if re.fullmatch(r"[0-9./:-]+", col):
                    continue
                candidates.append(col)
            if candidates:
                return candidates[-1]

    # 无法稳定抽列时返回匹配行
    return best_line


async def send_agent_reply(
    requester_user_id: int,
    question: str,
    room_id: Optional[str] = None,
    include_sources: bool = True,
) -> ChatMessage:
    room = room_id or settings.default_room
    context, sources = await query_knowledge(question, room_id=room)
    direct_answer = _extract_direct_answer(question, context)
    if direct_answer:
        answer_text = direct_answer
    else:
        answer_text = _llm_answer(question, context)
    part = build_text_part(answer_text)
    msg = await create_message(room, settings.agent_user_id, [part])
    msg.is_agent = True
    msg.agent_name = settings.agent_name
    msg.rag_sources = sources if include_sources else []
    return msg


async def fetch_history(
    room_id: Optional[str],
    limit: Optional[int] = 50,
    before_id: Optional[int] = None,
    all_rooms: bool = False,
) -> List[ChatMessage]:
    room = room_id or settings.default_room
    return await get_messages(room, limit=limit, before_id=before_id, all_rooms=all_rooms)
