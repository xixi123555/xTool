import { useEffect, useMemo, useState } from 'react';
import {
  createOrchestrationFlow,
  executeOrchestrationFlow,
  listOrchestrationFlows,
  OrchestrationEdge,
  OrchestrationGraph,
  OrchestrationNode,
  updateOrchestrationFlow,
} from '../../api/chatApi';
import { showToast } from '../../components/toast/Toast';
import { NodeCanvas } from '../../components/agent-orchestrator/NodeCanvas';
import { NodePalette } from '../../components/agent-orchestrator/NodePalette';
import { NodeConfigPanel } from '../../components/agent-orchestrator/NodeConfigPanel';

const defaultNodes: OrchestrationNode[] = [
  { id: 'input-1', type: 'input', label: '输入', position_x: 100, position_y: 120, config: {} },
  { id: 'rag-1', type: 'rag_retriever', label: '知识库检索', position_x: 340, position_y: 120, config: { top_k: 6 } },
  { id: 'llm-1', type: 'llm', label: 'LLM', position_x: 600, position_y: 120, config: { temperature: 0.2 } },
  { id: 'output-1', type: 'output', label: '输出', position_x: 850, position_y: 120, config: {} },
];
const defaultEdges: OrchestrationEdge[] = [
  { id: 'e1', source: 'input-1', target: 'rag-1' },
  { id: 'e2', source: 'rag-1', target: 'llm-1' },
  { id: 'e3', source: 'llm-1', target: 'output-1' },
];

export function AgentOrchestratorPage() {
  const [flowId, setFlowId] = useState<number | null>(null);
  const [flowName, setFlowName] = useState('聊天室智能体默认流程');
  const [flowDescription, setFlowDescription] = useState('输入 -> 检索 -> LLM -> 输出');
  const [nodes, setNodes] = useState<OrchestrationNode[]>(defaultNodes);
  const [edges, setEdges] = useState<OrchestrationEdge[]>(defaultEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('总结一下最近聊天室里关于项目计划的讨论');
  const [runOutput, setRunOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    listOrchestrationFlows()
      .then((items) => {
        if (items.length > 0) {
          const first = items[0];
          setFlowId(first.id);
          setFlowName(first.name);
          setFlowDescription(first.description || '');
          setNodes(first.graph?.nodes?.length ? first.graph.nodes : defaultNodes);
          setEdges(first.graph?.edges?.length ? first.graph.edges : defaultEdges);
        }
      })
      .catch(() => {
        showToast('加载编排列表失败');
      });
  }, []);

  const graph: OrchestrationGraph = { nodes, edges };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (!flowId) {
        const id = await createOrchestrationFlow({ name: flowName, description: flowDescription, graph });
        setFlowId(id);
      } else {
        await updateOrchestrationFlow(flowId, { name: flowName, description: flowDescription, graph });
      }
      showToast('编排保存成功');
    } catch {
      showToast('编排保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!flowId) {
      showToast('请先保存编排');
      return;
    }
    setLoading(true);
    try {
      const result = await executeOrchestrationFlow(flowId, { input_text: testInput, room_id: 'public' });
      setRunOutput(result.output_text);
      showToast('执行完成');
    } catch {
      showToast('执行失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none"
          placeholder="编排名称"
        />
        <input
          value={flowDescription}
          onChange={(e) => setFlowDescription(e.target.value)}
          className="h-9 w-[360px] rounded-lg border border-slate-200 px-3 text-sm outline-none"
          placeholder="编排描述"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="h-9 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          保存
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px] gap-3">
        <NodePalette nodes={nodes} onAddNode={(node) => setNodes((prev) => [...prev, node])} />
        <NodeCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onMoveNode={(id, x, y) =>
            setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position_x: x, position_y: y } : n)))
          }
          onAddEdge={(edge) => setEdges((prev) => [...prev, edge])}
          onDeleteEdge={(edgeId) => setEdges((prev) => prev.filter((e) => e.id !== edgeId))}
        />
        <NodeConfigPanel
          node={selectedNode}
          onUpdateNode={(patch) =>
            setNodes((prev) => prev.map((n) => (n.id === selectedNode?.id ? { ...n, ...patch } : n)))
          }
          testInput={testInput}
          onChangeTestInput={setTestInput}
          runOutput={runOutput}
          onRun={handleRun}
          running={loading}
        />
      </div>
    </div>
  );
}

