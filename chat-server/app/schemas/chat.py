from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional, List
from pydantic import BaseModel, Field


ChatPartType = Literal["text", "image", "file", "link"]


class ChatMessagePartPayload(BaseModel):
    text: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None
    size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None


class ChatMessagePart(BaseModel):
    type: ChatPartType
    payload: Optional[ChatMessagePartPayload] = None
    text: Optional[str] = None
    image_url: Optional[str] = None
    mime_type: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None


class ChatMessage(BaseModel):
    id: int
    room_id: str
    user_id: int
    content_json: List[ChatMessagePart]
    created_at: Optional[datetime] = None
    username: Optional[str] = None
    avatar: Optional[str] = None


class ChatUser(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    avatar: Optional[str] = None
    user_type: str = "normal"


class SendMessageRequest(BaseModel):
    text: Optional[str] = None
    parts: List[ChatMessagePart] = Field(default_factory=list)
    room_id: Optional[str] = None
