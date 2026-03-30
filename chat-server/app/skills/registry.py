from __future__ import annotations
from typing import Dict, Optional, List
from .base import Skill


class SkillRegistry:
    def __init__(self) -> None:
        self._skills: Dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        self._skills[skill.name] = skill

    def unregister(self, name: str) -> None:
        self._skills.pop(name, None)

    def list_enabled(self) -> List[Skill]:
        return [s for s in self._skills.values() if getattr(s, "enabled", False)]

    def get(self, name: str) -> Optional[Skill]:
        return self._skills.get(name)
