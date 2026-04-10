from __future__ import annotations
import json
import os
import re
from typing import Any, Dict, Optional, List, Tuple
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
_QUERY_SYNONYMS: Dict[str, List[str]] = {
    "整装总计": ["整装总计", "整装价格", "整装费用", "整装金额", "整装多少钱", "整装报价"],
    "半包": ["半包", "半包价格", "半包费用", "半包金额", "半包多少钱", "半包报价"],
    "设计费": ["设计费", "设计费用", "设计价格", "设计金额", "设计多少钱", "设计报价"],
}


def _resolve_llm_endpoint() -> Tuple[str, str, str]:
    """
    优先 DeepSeek（用户需求），否则回退现有通用配置。
    """
    if settings.deepseek_api_key:
        return (
            settings.deepseek_api_base.rstrip("/"),
            settings.deepseek_api_key,
            settings.deepseek_model or "deepseek-chat",
        )
    if settings.llm_api_base and settings.llm_api_key:
        return (
            settings.llm_api_base.rstrip("/"),
            settings.llm_api_key,
            settings.llm_model,
        )
    return ("", "", "")


def _chat_completion(messages: List[Dict[str, Any]], temperature: float = 0.2) -> str:
    api_base, api_key, model = _resolve_llm_endpoint()
    if not api_base or not api_key:
        return ""
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    req = request.Request(
        url=f"{api_base}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    with request.urlopen(req, timeout=settings.llm_timeout_seconds) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )


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
        extracted = _extractive_answer(question, context)
        if extracted:
            return extracted
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


def _parse_llm_json_object(raw: str) -> Optional[Dict[str, Any]]:
    text = (raw or "").strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        obj = json.loads(text)
        return obj if isinstance(obj, dict) else None
    except Exception:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            obj = json.loads(m.group(0))
            return obj if isinstance(obj, dict) else None
        except Exception:
            pass
    return None


def _llm_extract_slots(question: str) -> Optional[Dict[str, Any]]:
    """
    一步结构化抽取：专名、中文日期、检索查询。失败或未配置 LLM 时返回 None，由调用方走规则回退。
    """
    api_base, api_key, model = _resolve_llm_endpoint()
    if not api_base or not api_key:
        return None
    q = (question or "").strip()
    if not q:
        return None
    system = (
        "你是信息抽取助手，从用户问题中提取知识库检索与事实定位所需槽位。\n"
        "只输出一个 JSON 对象，不要 markdown 代码块，不要解释。\n"
        "字段（均可为 null）：\n"
        '- "person": 具体问题指向的人名（2～6 个汉字的专名），去掉「在」「的」「对」等黏连；无则 null。\n'
        '- "date_cn": 明确日期，统一为「YYYY年M月D日」（例：2026年1月4日）；无明确日期则 null。\n'
        '- "keywords": 字符串数组，除人名日期外有助于召回的词（如产品、模块名）；没有则为 []。\n'
        '- "retrieval_query": 用于向量检索的短句，建议用空格连接 person、日期的常见写法（含 2026/1/4）、keywords；'
        "信息极少时可用用户问题的关键词摘要。\n"
    )
    payload: Dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"用户问题：{q}"},
        ],
        "temperature": 0,
    }
    req = request.Request(
        url=f"{api_base}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=min(settings.llm_timeout_seconds, 30)) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
                .strip()
            )
            parsed = _parse_llm_json_object(raw)
            if not parsed:
                return None
            person = parsed.get("person")
            date_cn = parsed.get("date_cn")
            keywords = parsed.get("keywords") or []
            rq = parsed.get("retrieval_query")
            if not isinstance(keywords, list):
                keywords = []
            keywords = [str(x).strip() for x in keywords if str(x).strip()]
            out: Dict[str, Any] = {
                "person": str(person).strip() if person else "",
                "date_cn": str(date_cn).strip() if date_cn else "",
                "keywords": keywords,
                "retrieval_query": str(rq).strip() if rq else "",
            }
            if not out["person"] and not out["date_cn"] and not out["retrieval_query"] and not out["keywords"]:
                return None
            return out
    except Exception:
        return None


def _retrieval_query_from_slots(question: str, slots: Optional[Dict[str, Any]]) -> str:
    q = (question or "").strip()
    if not slots:
        return _expand_retrieval_query(q)
    rq = (slots.get("retrieval_query") or "").strip()
    if rq:
        return rq
    parts: List[str] = []
    if slots.get("person"):
        parts.append(str(slots["person"]).strip())
    if slots.get("date_cn"):
        parts.append(str(slots["date_cn"]).strip())
        m = re.match(r"(\d{4})年(\d{1,2})月(\d{1,2})日", str(slots["date_cn"]).strip())
        if m:
            parts.append(f"{m.group(1)}/{int(m.group(2))}/{int(m.group(3))}")
    for k in slots.get("keywords") or []:
        if k:
            parts.append(str(k))
    merged = " ".join(dict.fromkeys([p for p in parts if p]))
    base = merged if merged else q
    return _expand_retrieval_query(base)


def _expand_retrieval_query(query: str) -> str:
    q = (query or "").strip()
    if not q:
        return q
    parts: List[str] = [q]
    for canonical, aliases in _QUERY_SYNONYMS.items():
        if any(alias in q for alias in aliases):
            parts.append(canonical)
            parts.extend(aliases)
    return " ".join(dict.fromkeys([p for p in parts if p]))


def _llm_answer(question: str, context: str) -> str:
    api_base, api_key, model = _resolve_llm_endpoint()
    if not api_base or not api_key:
        return _mock_llm_answer(question, context)
    prompt = (
        "你是聊天室知识库问答助手。请仅基于给定知识库上下文回答问题。"
        "若上下文不足，请明确说无法确认并说明需要哪些补充信息。"
        "务必针对用户问题里具体询问的那一点作答，不要选用上下文里与所问无关的其它属性来回答。"
        "回答要简洁，并给出关键依据。\n\n"
        f"【知识库上下文】\n{context}\n\n【问题】{question}"
    )
    try:
        content = _chat_completion(
            messages=[
                {"role": "system", "content": "你是严谨的企业知识库问答助手。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return content or _mock_llm_answer(question, context)
    except Exception:
        return _mock_llm_answer(question, context)


# 工作日历/表格行中的日期片段（区别于「今年30岁」等叙述）
_LOG_CALENDAR_IN_CELL = re.compile(
    r"(?:\d{4}年\d{1,2}月\d{1,2}日|\d{4}/\d{1,2}/\d{1,2}|\d{4}-\d{1,2}-\d{1,2})"
)


def _columns_look_like_task_row(sep: str, cols: List[str]) -> bool:
    """仅对表格导出（|）或带公历日期的逗号分列行使用「末列即事项」启发式。"""
    if sep == "|":
        return True
    if sep in ("，", ","):
        return bool(cols) and any(_LOG_CALENDAR_IN_CELL.search(c) for c in cols)
    return False


def _extractive_answer(
    question: str,
    context: str,
) -> Optional[str]:
    """
    通用抽取式回退：
    1) 基于词项重叠选择最相关句段
    2) 对常见事实问句（如年龄）优先提炼最小答案片段
    """
    q = (question or "").strip()
    c = (context or "").strip()
    if not q or not c:
        return None

    q_tokens = [t.lower() for t in re.findall(r"[a-zA-Z0-9\u4e00-\u9fff]+", q)]
    if not q_tokens:
        return None

    segments = [s.strip() for s in re.split(r"[\n。！？；;]", c) if s.strip()]
    if not segments:
        return None

    best_segment = ""
    best_score = -1.0
    for seg in segments:
        seg_tokens = {t.lower() for t in re.findall(r"[a-zA-Z0-9\u4e00-\u9fff]+", seg)}
        if not seg_tokens:
            continue
        overlap = sum(1 for t in q_tokens if t in seg_tokens)
        if overlap <= 0:
            continue
        score = overlap / max(len(set(q_tokens)), 1)
        if score > best_score:
            best_score = score
            best_segment = seg

    if not best_segment:
        return None

    # 针对年龄问题，尽量提炼成最小答案片段（例如“30岁”）
    if any(k in q for k in ("几岁", "多大", "年龄")):
        m = re.search(r"(\d{1,3})\s*岁", best_segment)
        if m:
            return f"{m.group(1)}岁"

    return best_segment


def _extract_direct_answer(
    question: str,
    context: str,
    slots: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    # 保留兼容入口，不再使用硬编码的人名/日期规则
    del slots
    return _extractive_answer(question, context)


def _format_money_text(value: float) -> str:
    if abs(value - int(value)) < 1e-9:
        return f"¥{int(value)}"
    return f"¥{value:.2f}"


def _try_answer_amount_from_sources(question: str, sources: List[RagSource]) -> Optional[str]:
    q = (question or "").strip()
    if not q or not sources:
        return None
    if not any(k in q for k in ("多少钱", "金额", "费用", "价格", "多少")):
        return None

    amount_key_tokens = ("金额", "价格", "费用", "费", "单价", "总计", "总额", "合计")
    target_tokens = [t for t in re.findall(r"[\u4e00-\u9fff]{2,8}", q) if t not in ("多少钱", "多少", "金额", "费用", "价格")]
    best: Tuple[float, Optional[float], Optional[str], Optional[int], Optional[str]] = (-1.0, None, None, None, None)
    # score, amount, sheet, row_index, label

    for src in sources:
        row_data = src.row_data or {}
        if not row_data:
            continue
        row_text = "；".join([f"{k}:{v}" for k, v in row_data.items()])
        score = float(src.score or 0)
        if target_tokens and any(tk in row_text for tk in target_tokens):
            score += 1.2
        if any(k in row_text for k in amount_key_tokens):
            score += 0.8

        best_amount: Optional[float] = None
        best_label: Optional[str] = None
        for k, v in row_data.items():
            key_text = str(k)
            val_text = str(v)
            if not any(token in key_text for token in amount_key_tokens):
                continue
            m = re.search(r"-?\d+(?:\.\d+)?", val_text.replace(",", ""))
            if not m:
                continue
            try:
                num = float(m.group(0))
            except Exception:
                continue
            best_amount = num
            best_label = key_text
            if "价格" in key_text or "金额" in key_text:
                break

        if best_amount is None:
            continue
        if score > best[0]:
            best = (score, best_amount, src.sheet_name, src.row_index, best_label)

    if best[1] is None:
        return None

    amount_text = _format_money_text(float(best[1]))
    position = ""
    if best[2] and best[3]:
        position = f"（来源：{best[2]} 第{best[3]}行）"
    elif best[2]:
        position = f"（来源：{best[2]}）"
    subject = ""
    if target_tokens:
        subject = target_tokens[0]
    if not subject:
        subject = "该项费用"
    return f"{subject}是 {amount_text}{position}"


async def send_agent_reply(
    requester_user_id: int,
    question: str,
    room_id: Optional[str] = None,
    include_sources: bool = True,
) -> ChatMessage:
    room = room_id or settings.default_room
    slots = _llm_extract_slots(question)
    retrieval_q = _retrieval_query_from_slots(question, slots)
    slot_person = (slots.get("person") or "").strip() if slots else ""
    slot_date_cn = (slots.get("date_cn") or "").strip() if slots else ""
    context, sources = await query_knowledge(
        retrieval_q,
        room_id=room,
        slot_person=slot_person or None,
        slot_date_cn=slot_date_cn or None,
    )
    answer_text = _try_answer_amount_from_sources(question, sources) or _llm_answer(question, context)
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
