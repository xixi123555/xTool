from __future__ import annotations
from typing import Optional, List
from app.schemas.chat import ChatMessagePart, ChatMessagePartPayload


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def build_text_part(text: str) -> ChatMessagePart:
    normalized = _clean(text) or ""
    return ChatMessagePart(
        type="text",
        payload=ChatMessagePartPayload(text=normalized),
        text=normalized,
    )


def normalize_part(part: ChatMessagePart) -> Optional[ChatMessagePart]:
    if part.type == "text":
        text = _clean((part.payload.text if part.payload else None) or part.text)
        return build_text_part(text) if text else None

    if part.type == "image":
        url = _clean((part.payload.url if part.payload else None) or part.image_url)
        if not url:
            return None
        mime = _clean((part.payload.mime_type if part.payload else None) or part.mime_type)
        return ChatMessagePart(
            type="image",
            payload=ChatMessagePartPayload(
                url=url,
                mime_type=mime,
                name=part.payload.name if part.payload else None,
                size=part.payload.size if part.payload else None,
                width=part.payload.width if part.payload else None,
                height=part.payload.height if part.payload else None,
            ),
            image_url=url,
            mime_type=mime,
        )

    if part.type == "file":
        url = _clean((part.payload.url if part.payload else None) or part.file_url)
        name = _clean((part.payload.name if part.payload else None) or part.file_name)
        if not url:
            return None
        size = (part.payload.size if part.payload else None) or part.file_size
        mime_type = _clean(part.payload.mime_type if part.payload else None) or part.mime_type
        return ChatMessagePart(
            type="file",
            payload=ChatMessagePartPayload(
                url=url,
                name=name,
                size=size,
                mime_type=mime_type,
            ),
            file_url=url,
            file_name=name,
            file_size=size,
            mime_type=mime_type,
        )

    url = _clean(part.payload.url if part.payload else None)
    if not url:
        return None
    return ChatMessagePart(
        type="link",
        payload=ChatMessagePartPayload(
            url=url,
            title=_clean(part.payload.title if part.payload else None),
            description=_clean(part.payload.description if part.payload else None),
        ),
    )


def normalize_parts(parts: List[ChatMessagePart]) -> List[ChatMessagePart]:
    normalized: List[ChatMessagePart] = []
    for part in parts or []:
        item = normalize_part(part)
        if item:
            normalized.append(item)
    return normalized
