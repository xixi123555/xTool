from __future__ import annotations
import hashlib
import csv
import json
import math
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Tuple
import openpyxl
import xlrd
from app.core.settings import settings
from app.repositories.vector_store_repository import (
    ensure_vector_tables,
    list_candidates,
    list_chat_file_documents,
    upsert_document,
    upsert_vector,
)
from app.schemas.chat import RagSource


_TOKEN_RE = re.compile(r"[a-zA-Z0-9\u4e00-\u9fff]+")
_DIM = 128
_MAX_EXTRACT_LINES = 20000


def _tokenize(text: str) -> List[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def _hash_embed(text: str) -> List[float]:
    vec = [0.0] * _DIM
    tokens = _tokenize(text)
    if not tokens:
        return vec
    for token in tokens:
        hv = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        idx = hv % _DIM
        vec[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return float(sum(x * y for x, y in zip(a, b)))


def _keyword_overlap(query: str, content: str) -> float:
    q = set(_tokenize(query))
    c = set(_tokenize(content))
    if not q or not c:
        return 0.0
    return len(q.intersection(c)) / max(len(q), 1)


def _hybrid_score(query: str, query_vec: List[float], doc_text: str, doc_vec: List[float]) -> float:
    dense_score = _cosine(query_vec, doc_vec)
    sparse_score = _keyword_overlap(query, doc_text)
    return dense_score * 0.65 + sparse_score * 0.35


def _query_entities(query: str) -> Tuple[str, str]:
    q = (query or "").strip()
    date_tokens = re.findall(r"\d{4}年\d{1,2}月\d{1,2}日", q)
    cn_tokens = re.findall(r"[\u4e00-\u9fa5]{2,4}", q)
    ignore_parts = ("什么", "做了", "哪些", "哪天", "当天", "内容", "事项", "文档", "做啥", "做过")
    raw_name_tokens = [t for t in cn_tokens if not any(part in t for part in ignore_parts)]
    stop_chars = ("在", "于", "把", "将")
    name_tokens: List[str] = []
    for t in raw_name_tokens:
        cleaned = t.strip()
        while len(cleaned) > 2 and cleaned.endswith(stop_chars):
            cleaned = cleaned[:-1]
        if len(cleaned) >= 2:
            name_tokens.append(cleaned)
    target_name = name_tokens[0] if name_tokens else ""
    target_date = date_tokens[0] if date_tokens else ""
    return target_name, target_date


def _date_alternatives(date_text: str) -> List[str]:
    d = (date_text or "").strip()
    if not d:
        return []
    m = re.match(r"(\d{4})年(\d{1,2})月(\d{1,2})日", d)
    if not m:
        return [d]
    y, mo, da = m.group(1), int(m.group(2)), int(m.group(3))
    return [d, f"{y}/{mo}/{da}", f"{y}/{mo:02d}/{da:02d}", f"{y}-{mo:02d}-{da:02d}"]


def _best_context_snippet(text: str, query: str, remain: int) -> str:
    content = (text or "").strip()
    if len(content) <= remain:
        return content
    target_name, target_date = _query_entities(query)
    query_tokens = [t for t in _tokenize(query) if t]
    date_tokens = _date_alternatives(target_date)
    lines = [ln for ln in content.splitlines() if ln.strip()]
    if not lines:
        return content[:remain]

    best_idx = 0
    best_score = -1
    for idx, line in enumerate(lines):
        score = 0
        if target_name and target_name in line:
            score += 4
        if date_tokens and any(dt in line for dt in date_tokens):
            score += 4
        for tk in query_tokens[:8]:
            if tk and tk in line:
                score += 1
        if score > best_score:
            best_score = score
            best_idx = idx

    if best_score <= 0:
        return content[:remain]

    window_lines: List[str] = []
    consumed = 0
    start = max(0, best_idx - 30)
    end = min(len(lines), best_idx + 31)
    for ln in lines[start:end]:
        n = len(ln) + 1
        if consumed + n > remain:
            break
        window_lines.append(ln)
        consumed += n
    return "\n".join(window_lines) if window_lines else content[:remain]


def _source_weight(source_type: str) -> float:
    if source_type in ("chat_file", "manual_text"):
        return 1.2
    if source_type == "chat_message":
        return 0.9
    return 1.0


async def ensure_ready() -> None:
    await ensure_vector_tables()


async def upsert_knowledge_document(
    room_id: str,
    source_type: str,
    source_id: Optional[str],
    content_text: str,
    metadata: Optional[Dict] = None,
) -> int:
    doc_id = await upsert_document(
        room_id=room_id,
        source_type=source_type,
        source_id=source_id,
        content_text=content_text,
        metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
    )
    if doc_id <= 0:
        return 0
    vector = _hash_embed(content_text)
    await upsert_vector(doc_id=doc_id, vector_json=json.dumps(vector))
    return doc_id


async def ingest_chat_message(
    message_id: int,
    room_id: str,
    text: str,
    extra: Optional[Dict] = None,
) -> int:
    if not text.strip():
        return 0
    return await upsert_knowledge_document(
        room_id=room_id,
        source_type="chat_message",
        source_id=str(message_id),
        content_text=text.strip(),
        metadata=extra or {},
    )


async def ingest_uploaded_file(
    room_id: str,
    file_url: str,
    file_name: str,
    mime_type: str,
    file_size: int,
    local_path: Optional[str] = None,
) -> int:
    extracted_text = _extract_file_text(local_path, file_name, mime_type)
    summary = (
        f"文件名: {file_name}\n类型: {mime_type}\n大小: {file_size}\n链接: {file_url}\n\n"
        f"抽取内容:\n{extracted_text if extracted_text else '（暂未抽取到可读文本）'}"
    )
    return await upsert_knowledge_document(
        room_id=room_id,
        source_type="chat_file",
        source_id=file_url,
        content_text=summary,
        metadata={"name": file_name, "mime_type": mime_type, "size": file_size, "url": file_url},
    )


async def query_knowledge(
    query: str,
    room_id: str,
    top_k: Optional[int] = None,
    candidate_k: Optional[int] = None,
) -> Tuple[str, List[RagSource]]:
    q = (query or "").strip()
    if not q:
        return "", []

    q_vec = _hash_embed(q)
    target_name, target_date = _query_entities(q)
    candidates = await list_candidates(room_id=room_id, limit=candidate_k or settings.kb_candidate_k)
    ranked: List[Tuple[float, Dict]] = []
    for item in candidates:
        source_type = str(item.get("source_type") or "")
        text_value = item.get("content_text") or ""
        # 避免历史机器人问答反哺污染检索结果
        if source_type == "chat_message" and "用户问题：" in text_value and "智能体回答：" in text_value:
            continue
        raw_vec = item.get("vector_json") or "[]"
        try:
            doc_vec = json.loads(raw_vec)
        except Exception:
            doc_vec = []
        score = _hybrid_score(q, q_vec, text_value, doc_vec) * _source_weight(source_type)
        date_alts = _date_alternatives(target_date)
        has_name = bool(target_name and target_name in text_value)
        has_date = bool(date_alts and any(dt in text_value for dt in date_alts))
        if has_name:
            score *= 1.2
        if has_date:
            score *= 1.35
        if has_name and has_date:
            score *= 1.5
        # 问题明确带日期时，缺日期的通用手工知识降权，避免挤占上下文窗口
        if source_type == "manual_text" and target_date and not has_date:
            score *= 0.45
        # 文件只有元信息而没有抽取内容时降权，避免压过真实内容文档
        if source_type == "chat_file" and "抽取内容:" not in text_value:
            score *= 0.35
        ranked.append((score, item))
    ranked.sort(key=lambda x: x[0], reverse=True)
    selected = ranked[: max(1, top_k or settings.kb_top_k)]

    snippets: List[str] = []
    sources: List[RagSource] = []
    consumed = 0
    for score, item in selected:
        text = (item.get("content_text") or "").strip()
        if not text:
            continue
        remain = settings.kb_max_context_chars - consumed
        if remain <= 0:
            break
        snippet = _best_context_snippet(text, q, remain)
        consumed += len(snippet)
        snippets.append(snippet)
        sources.append(
            RagSource(
                doc_id=int(item["id"]),
                source_type=str(item.get("source_type") or "unknown"),
                source_id=str(item.get("source_id")) if item.get("source_id") is not None else None,
                score=round(float(score), 4),
                snippet=snippet[:180],
            )
        )
    return "\n\n".join(snippets), sources


def _extract_file_text(local_path: Optional[str], file_name: str, mime_type: str) -> str:
    if not local_path or not os.path.exists(local_path):
        return ""
    lower_name = (file_name or "").lower()
    lower_mime = (mime_type or "").lower()
    try:
        if lower_name.endswith(".txt") or lower_name.endswith(".md") or "text/" in lower_mime:
            return _read_text_file(local_path)
        if lower_name.endswith(".json") or "json" in lower_mime:
            return _read_text_file(local_path)
        if lower_name.endswith(".csv") or "csv" in lower_mime:
            return _read_csv_file(local_path)
        if lower_name.endswith(".xlsx"):
            return _read_xlsx_file(local_path)
        if lower_name.endswith(".xls") or "ms-excel" in lower_mime:
            return _read_xls_file(local_path)
    except Exception:
        return ""
    return ""


def _read_text_file(path: str) -> str:
    for encoding in ("utf-8", "gbk", "latin-1"):
        try:
            with open(path, "r", encoding=encoding, errors="ignore") as f:
                return f.read(12000)
        except Exception:
            continue
    return ""


def _read_csv_file(path: str) -> str:
    rows: List[str] = []
    with open(path, "r", encoding="utf-8", errors="ignore", newline="") as f:
        reader = csv.reader(f)
        for idx, row in enumerate(reader):
            if idx >= 200:
                break
            rows.append(" | ".join([str(x) for x in row if str(x).strip()]))
    return "\n".join(rows)


def _read_xlsx_file(path: str) -> str:
    try:
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        lines: List[str] = []
        for ws in reversed(wb.worksheets):
            lines.append(f"[sheet] {ws.title}")
            for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
                if row_idx >= 1000:
                    break
                cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
                if cells:
                    lines.append(" | ".join(cells))
                if len(lines) >= _MAX_EXTRACT_LINES:
                    break
            if len(lines) >= _MAX_EXTRACT_LINES:
                break
        normalized = _normalize_sheet_matrix(lines)
        # 优先保留结构化三元组，避免中段被裁剪导致“姓名+日期+事项”丢失
        merged = normalized if normalized else lines
        text = _fit_text_budget("\n".join(merged), 50000)
        if text.strip():
            return text
    except Exception:
        pass
    # 兜底：部分 WPS/非标准 xlsx 会在 openpyxl 样式解析失败，改用 XML 直读
    return _read_xlsx_xml_fallback(path)


def _read_xls_file(path: str) -> str:
    with open(path, "rb") as f:
        content = f.read()
    wb = xlrd.open_workbook(file_contents=content)
    lines: List[str] = []
    for sheet_idx in range(wb.nsheets - 1, -1, -1):
        ws = wb.sheet_by_index(sheet_idx)
        lines.append(f"[sheet] {ws.name}")
        for row_idx in range(min(ws.nrows, 1000)):
            cells = []
            for col_idx in range(ws.ncols):
                val = ws.cell_value(row_idx, col_idx)
                text = str(val).strip()
                if text:
                    cells.append(text)
            if cells:
                lines.append(" | ".join(cells))
            if len(lines) >= _MAX_EXTRACT_LINES:
                break
        if len(lines) >= _MAX_EXTRACT_LINES:
            break
    normalized = _normalize_sheet_matrix(lines)
    merged = normalized if normalized else lines
    return _fit_text_budget("\n".join(merged), 50000)


def _read_xlsx_xml_fallback(path: str) -> str:
    ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    lines: List[str] = []
    matrix_lines: List[str] = []
    try:
        with zipfile.ZipFile(path, "r") as z:
            shared_strings: List[str] = []
            if "xl/sharedStrings.xml" in z.namelist():
                root = ET.fromstring(z.read("xl/sharedStrings.xml"))
                for si in root.findall("s:si", ns):
                    # si 可能由多个 r/t 组成
                    parts = []
                    for t in si.findall(".//s:t", ns):
                        if t.text:
                            parts.append(t.text)
                    shared_strings.append("".join(parts).strip())

            wb_root = ET.fromstring(z.read("xl/workbook.xml"))
            sheet_nodes = wb_root.findall("s:sheets/s:sheet", ns)
            rel_root = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
            rel_ns = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
            rel_map = {}
            for rel in rel_root.findall("r:Relationship", rel_ns):
                rel_map[rel.attrib.get("Id")] = rel.attrib.get("Target", "")

            for sheet in reversed(sheet_nodes):
                sheet_name = sheet.attrib.get("name", "sheet")
                rid = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                target = rel_map.get(rid or "", "")
                if not target:
                    continue
                if not target.startswith("worksheets/"):
                    continue
                sheet_xml_path = f"xl/{target}"
                if sheet_xml_path not in z.namelist():
                    continue
                lines.append(f"[sheet] {sheet_name}")
                matrix_lines.append(f"[sheet] {sheet_name}")
                sheet_root = ET.fromstring(z.read(sheet_xml_path))
                rows = sheet_root.findall("s:sheetData/s:row", ns)
                sheet_rows: List[List[str]] = []
                for row_idx, row in enumerate(rows):
                    if row_idx >= 1000:
                        break
                    vals = []
                    for c in row.findall("s:c", ns):
                        cell_type = c.attrib.get("t")
                        v = c.find("s:v", ns)
                        if v is None or v.text is None:
                            continue
                        raw = v.text.strip()
                        if not raw:
                            continue
                        if cell_type == "s":
                            try:
                                si = int(raw)
                                value = shared_strings[si] if 0 <= si < len(shared_strings) else raw
                            except Exception:
                                value = raw
                        else:
                            value = raw
                        value = value.strip()
                        if value:
                            vals.append(value)
                    if vals:
                        lines.append(" | ".join(vals))
                        sheet_rows.append(vals)
                    if len(lines) >= _MAX_EXTRACT_LINES:
                        break
                matrix_lines.extend(_build_member_date_triples(sheet_rows))
                if len(lines) >= _MAX_EXTRACT_LINES:
                    break
    except Exception:
        return ""
    merged = matrix_lines if matrix_lines else lines
    return _fit_text_budget("\n".join(merged), 50000)


def _fit_text_budget(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    head = int(limit * 0.65)
    tail = max(limit - head - 32, 0)
    return text[:head] + "\n...[trimmed]...\n" + text[-tail:]


def _is_date_cell(value: str) -> bool:
    v = (value or "").strip()
    if not v:
        return False
    return bool(re.search(r"\d{4}[/-]\d{1,2}[/-]\d{1,2}", v))


def _build_member_date_triples(rows: List[List[str]]) -> List[str]:
    if not rows:
        return []
    header_idx = -1
    for idx, row in enumerate(rows[:20]):
        if any("成员" in c for c in row) and any(_is_date_cell(c) for c in row):
            header_idx = idx
            break
    if header_idx < 0:
        return []

    header = rows[header_idx]
    triples: List[str] = []
    member_counts: Dict[str, int] = {}
    per_member_cap = 8
    for row in rows[header_idx + 1 :]:
        if not row:
            continue
        member = row[0].strip() if len(row) > 0 else ""
        if not member or member in ("成员", "今日工作", "明日工作", "问题"):
            continue
        max_cols = min(len(header), len(row))
        for col_idx in range(1, max_cols):
            date_label = header[col_idx].strip() if col_idx < len(header) else ""
            if not _is_date_cell(date_label):
                continue
            task = row[col_idx].strip() if col_idx < len(row) else ""
            if not task:
                continue
            used = member_counts.get(member, 0)
            if used >= per_member_cap:
                continue
            triples.append(f"{member} | {date_label} | {task}")
            member_counts[member] = used + 1
            if len(triples) >= 2500:
                return triples
    return triples


def _normalize_sheet_matrix(lines: List[str]) -> List[str]:
    normalized: List[str] = []
    current_rows: List[List[str]] = []
    for line in lines:
        if not line:
            continue
        if line.startswith("[sheet] "):
            if current_rows:
                normalized.extend(_build_member_date_triples(current_rows))
                current_rows = []
            normalized.append(line)
            continue
        current_rows.append([c.strip() for c in line.split("|") if c.strip()])
    if current_rows:
        normalized.extend(_build_member_date_triples(current_rows))
    return normalized


async def rebuild_uploaded_files_kb(limit: int = 500) -> Dict[str, int]:
    docs = await list_chat_file_documents(limit=limit)
    total = 0
    ok = 0
    skipped = 0
    for doc in docs:
        total += 1
        source_id = str(doc.get("source_id") or "").strip()
        metadata = doc.get("metadata_json")
        if not source_id:
            skipped += 1
            continue
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except Exception:
                metadata = {}
        metadata = metadata or {}
        file_name = str(metadata.get("name") or "附件")
        mime_type = str(metadata.get("mime_type") or "application/octet-stream")
        file_size = int(metadata.get("size") or 0)
        filename = source_id.rstrip("/").split("/")[-1]
        local_path = os.path.join(settings.upload_dir, filename) if filename else ""
        if not local_path or not os.path.exists(local_path):
            skipped += 1
            continue
        await ingest_uploaded_file(
            room_id=str(doc.get("room_id") or settings.default_room),
            file_url=source_id,
            file_name=file_name,
            mime_type=mime_type,
            file_size=file_size,
            local_path=local_path,
        )
        ok += 1
    return {"total": total, "ok": ok, "skipped": skipped}

