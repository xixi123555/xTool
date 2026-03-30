from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, Any, Optional, Dict


@dataclass
class SkillContext:
    user_id: int
    room_id: str
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class Skill(Protocol):
    name: str
    description: str
    enabled: bool

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        ...
