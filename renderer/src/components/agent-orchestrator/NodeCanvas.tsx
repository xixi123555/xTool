import { useMemo, useState } from 'react';
import { OrchestrationEdge, OrchestrationNode } from '../../api/chatApi';

interface NodeCanvasProps {
  nodes: OrchestrationNode[];
  edges: OrchestrationEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onMoveNode: (nodeId: string, x: number, y: number) => void;
  onAddEdge: (edge: OrchestrationEdge) => void;
  onDeleteEdge: (edgeId: string) => void;
}

export function NodeCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
  onAddEdge,
  onDeleteEdge,
}: NodeCanvasProps) {
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const nodeIdSet = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  return (
    <div
      className="relative min-h-0 rounded-xl border border-slate-200 bg-white"
      onMouseMove={(e) => {
        if (!dragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onMoveNode(dragging.id, e.clientX - rect.left - dragging.offsetX, e.clientY - rect.top - dragging.offsetY);
      }}
      onMouseUp={() => setDragging(null)}
      onMouseLeave={() => setDragging(null)}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1">
        <select
          className="h-8 rounded border border-slate-200 px-2 text-xs"
          value={sourceNode}
          onChange={(e) => setSourceNode(e.target.value)}
        >
          <option value="">选择来源节点</option>
          {nodes.map((n) => (
            <option key={`src-${n.id}`} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
        <select
          className="h-8 rounded border border-slate-200 px-2 text-xs"
          value={targetNode}
          onChange={(e) => setTargetNode(e.target.value)}
        >
          <option value="">选择目标节点</option>
          {nodes.map((n) => (
            <option key={`dst-${n.id}`} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
        <button
          className="h-8 rounded bg-slate-800 px-2 text-xs font-semibold text-white"
          type="button"
          onClick={() => {
            if (!sourceNode || !targetNode || sourceNode === targetNode) return;
            onAddEdge({ id: `edge-${Date.now()}`, source: sourceNode, target: targetNode });
          }}
        >
          连线
        </button>
      </div>

      <svg className="absolute inset-0 h-full w-full">
        {edges
          .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
          .map((e) => {
            const source = nodes.find((n) => n.id === e.source)!;
            const target = nodes.find((n) => n.id === e.target)!;
            const x1 = source.position_x + 72;
            const y1 = source.position_y + 18;
            const x2 = target.position_x + 72;
            const y2 = target.position_y + 18;
            return (
              <g key={e.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth={2} />
              </g>
            );
          })}
      </svg>

      {nodes.map((n) => (
        <div
          key={n.id}
          className={`absolute w-36 cursor-move rounded-lg border px-2 py-2 text-xs shadow-sm ${
            selectedNodeId === n.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'
          }`}
          style={{ left: n.position_x, top: n.position_y }}
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setDragging({ id: n.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
            onSelectNode(n.id);
          }}
        >
          <p className="font-semibold text-slate-700">{n.label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{n.type}</p>
        </div>
      ))}

      <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
        <p className="mb-1 font-semibold text-slate-700">连线列表</p>
        <div className="max-h-16 overflow-auto">
          {edges.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-0.5 text-slate-600">
              <span>
                {e.source} → {e.target}
              </span>
              <button className="text-rose-500" type="button" onClick={() => onDeleteEdge(e.id)}>
                删除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

