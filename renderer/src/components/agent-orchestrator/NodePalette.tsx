import { OrchestrationNode } from '../../api/chatApi';

interface NodePaletteProps {
  nodes: OrchestrationNode[];
  onAddNode: (node: OrchestrationNode) => void;
}

const nodeTypes: Array<{ type: OrchestrationNode['type']; label: string }> = [
  { type: 'input', label: '输入节点' },
  { type: 'rag_retriever', label: '知识库检索' },
  { type: 'llm', label: 'LLM 节点' },
  { type: 'output', label: '输出节点' },
];

export function NodePalette({ nodes, onAddNode }: NodePaletteProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-sm font-semibold text-slate-700">节点面板</p>
      <div className="space-y-2">
        {nodeTypes.map((item) => (
          <button
            key={item.type}
            type="button"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
            onClick={() =>
              onAddNode({
                id: `${item.type}-${Date.now()}`,
                type: item.type,
                label: item.label,
                position_x: 120 + (nodes.length % 4) * 40,
                position_y: 120 + (nodes.length % 5) * 30,
                config: {},
              })
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

