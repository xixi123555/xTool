import { ArrowRight, Bot, Database, Play, Plus, Save, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { errorMessage } from '../../shared/lib/http';
import { toast } from '../../shared/store/feedback';
import { Page, PageHeader, Spinner } from '../../shared/ui/Page';
import {
  createFlow,
  executeFlow,
  listFlows,
  updateFlow,
  type OrchestrationFlow,
  type OrchestrationGraph,
  type OrchestrationNode,
} from './api';

const NODE_META: Record<
  OrchestrationNode['type'],
  { label: string; icon: typeof Bot; description: string }
> = {
  input: { label: '输入', icon: Play, description: '接收用户问题' },
  rag_retriever: { label: '知识库检索', icon: Database, description: '从公共知识库找相关片段' },
  llm: { label: 'LLM', icon: Sparkles, description: '结合上下文生成回答' },
  output: { label: '输出', icon: Bot, description: '返回最终回答' },
};

function defaultNodes(): OrchestrationNode[] {
  return [
    { id: 'input-1', type: 'input', label: '输入', position_x: 0, position_y: 0, config: {} },
    {
      id: 'rag-1',
      type: 'rag_retriever',
      label: '知识库检索',
      position_x: 1,
      position_y: 0,
      config: { top_k: 6 },
    },
    {
      id: 'llm-1',
      type: 'llm',
      label: 'LLM',
      position_x: 2,
      position_y: 0,
      config: { temperature: 0.2 },
    },
    { id: 'output-1', type: 'output', label: '输出', position_x: 3, position_y: 0, config: {} },
  ];
}

function buildGraph(nodes: OrchestrationNode[]): OrchestrationGraph {
  return {
    nodes,
    edges: nodes.slice(0, -1).map((node, index) => ({
      id: `edge-${index}`,
      source: node.id,
      target: nodes[index + 1]?.id ?? node.id,
    })),
  };
}

export function OrchestratorPage() {
  const [flows, setFlows] = useState<OrchestrationFlow[]>([]);
  const [flowId, setFlowId] = useState<number | null>(null);
  const [name, setName] = useState('聊天室默认流程');
  const [description, setDescription] = useState('输入 → 知识库检索 → LLM → 输出');
  const [nodes, setNodes] = useState<OrchestrationNode[]>(defaultNodes);
  const [testInput, setTestInput] = useState('总结一下最近聊天室里关于项目计划的讨论');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    listFlows()
      .then((items) => {
        setFlows(items);
        const first = items[0];
        if (first) {
          setFlowId(first.id);
          setName(first.name);
          setDescription(first.description ?? '');
          setNodes(first.graph?.nodes?.length ? first.graph.nodes : defaultNodes());
        }
      })
      .catch((error) => toast(errorMessage(error, '加载流程失败'), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const graph = useMemo(() => buildGraph(nodes), [nodes]);

  const handleSelectFlow = (id: string) => {
    const flow = flows.find((item) => item.id === Number(id));
    if (!flow) return;
    setFlowId(flow.id);
    setName(flow.name);
    setDescription(flow.description ?? '');
    setNodes(flow.graph?.nodes?.length ? flow.graph.nodes : defaultNodes());
    setOutput('');
  };

  const handleNew = () => {
    setFlowId(null);
    setName('新的流程');
    setDescription('输入 → 知识库检索 → LLM → 输出');
    setNodes(defaultNodes());
    setOutput('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast('请填写流程名称', 'error');
      return;
    }
    setSaving(true);
    try {
      if (flowId) {
        await updateFlow(flowId, { name: name.trim(), description: description.trim(), graph });
      } else {
        const id = await createFlow({ name: name.trim(), description: description.trim(), graph });
        setFlowId(id);
        // 列表刷新失败不影响“已保存”的事实
        void listFlows()
          .then(setFlows)
          .catch(() => undefined);
      }
      toast('流程已保存', 'success');
    } catch (error) {
      toast(errorMessage(error, '保存失败'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    if (!flowId) {
      toast('请先保存流程', 'error');
      return;
    }
    if (!testInput.trim()) {
      toast('请输入测试问题', 'error');
      return;
    }
    setRunning(true);
    setOutput('');
    try {
      const result = await executeFlow(flowId, testInput.trim());
      setOutput(result.output_text);
    } catch (error) {
      toast(errorMessage(error, '执行失败'), 'error');
    } finally {
      setRunning(false);
    }
  };

  const updateConfig = (id: string, key: string, value: number) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === id ? { ...node, config: { ...node.config, [key]: value } } : node,
      ),
    );
  };

  if (loading) {
    return (
      <Page>
        <Spinner />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="智能体编排"
        description="固定四段式流程：输入、知识库检索、LLM、输出。"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={handleNew}>
              <Plus className="h-4 w-4" />
              新建
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? '保存中…' : '保存'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleRun()}
              disabled={running || !flowId}
            >
              <Play className="h-4 w-4" />
              {running ? '执行中…' : '运行'}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <section className="card space-y-3 p-4">
            {flows.length > 0 && (
              <div>
                <label className="label" htmlFor="flow-select">
                  已有流程
                </label>
                <select
                  id="flow-select"
                  className="field"
                  value={flowId ?? ''}
                  onChange={(event) => handleSelectFlow(event.target.value)}
                >
                  {!flowId && <option value="">未保存的新流程</option>}
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label" htmlFor="flow-name">
                流程名称
              </label>
              <input
                id="flow-name"
                className="field"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="flow-description">
                描述
              </label>
              <input
                id="flow-description"
                className="field"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </section>

          <section className="card space-y-3 p-4">
            <p className="section-title">节点参数</p>
            {nodes
              .filter((node) => node.type === 'rag_retriever' || node.type === 'llm')
              .map((node) => (
                <div key={node.id}>
                  <label className="label" htmlFor={`${node.id}-config`}>
                    {node.type === 'rag_retriever' ? '检索条数 top_k' : '温度 temperature'}
                  </label>
                  <input
                    id={`${node.id}-config`}
                    type="number"
                    step={node.type === 'llm' ? 0.1 : 1}
                    min={node.type === 'llm' ? 0 : 1}
                    max={node.type === 'llm' ? 1 : 20}
                    className="field"
                    value={
                      node.type === 'rag_retriever'
                        ? Number(node.config.top_k ?? 6)
                        : Number(node.config.temperature ?? 0.2)
                    }
                    onChange={(event) =>
                      updateConfig(
                        node.id,
                        node.type === 'rag_retriever' ? 'top_k' : 'temperature',
                        Number(event.target.value),
                      )
                    }
                  />
                </div>
              ))}
          </section>
        </div>

        <div className="space-y-3">
          <section className="card p-4">
            <p className="section-title mb-4">流程预览</p>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              {nodes.map((node, index) => {
                const meta = NODE_META[node.type];
                const Icon = meta.icon;
                return (
                  <div key={node.id} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-1 flex-col items-center rounded-xl border border-line bg-muted px-3 py-4 text-center">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-accent shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="mt-2 text-sm font-medium text-fg">{meta.label}</span>
                      <span className="mt-0.5 text-[11px] text-subtle">{meta.description}</span>
                    </div>
                    {index < nodes.length - 1 && (
                      <ArrowRight className="hidden h-4 w-4 flex-shrink-0 text-subtle md:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card space-y-3 p-4">
            <p className="section-title">试运行</p>
            <textarea
              className="field min-h-24 resize-y"
              placeholder="输入一个问题，查看流程输出"
              value={testInput}
              onChange={(event) => setTestInput(event.target.value)}
            />
            <div className="rounded-xl border border-line bg-muted p-3 text-sm leading-6 text-fg">
              {running ? (
                <span className="text-subtle">正在执行流程…</span>
              ) : output ? (
                <p className="whitespace-pre-wrap">{output}</p>
              ) : (
                <span className="text-subtle">点右上角「运行」查看输出。</span>
              )}
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}
