from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


NodeType = Literal["input", "rag_retriever", "llm", "output"]


class OrchestrationNode(BaseModel):
    id: str
    type: NodeType
    label: str
    position_x: float = 0
    position_y: float = 0
    config: Dict[str, Any] = Field(default_factory=dict)


class OrchestrationEdge(BaseModel):
    id: str
    source: str
    target: str


class OrchestrationGraph(BaseModel):
    nodes: List[OrchestrationNode] = Field(default_factory=list)
    edges: List[OrchestrationEdge] = Field(default_factory=list)


class SaveOrchestrationRequest(BaseModel):
    name: str
    description: Optional[str] = None
    graph: OrchestrationGraph


class UpdateOrchestrationRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    graph: Optional[OrchestrationGraph] = None


class ExecuteOrchestrationRequest(BaseModel):
    input_text: str
    room_id: Optional[str] = None

