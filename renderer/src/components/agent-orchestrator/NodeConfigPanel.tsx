import { OrchestrationNode } from '../../api/chatApi';

interface NodeConfigPanelProps {
  node: OrchestrationNode | null;
  onUpdateNode: (patch: Partial<OrchestrationNode>) => void;
  testInput: string;
  onChangeTestInput: (value: string) => void;
  runOutput: string;
  onRun: () => void;
  running?: boolean;
}

export function NodeConfigPanel({
  node,
  onUpdateNode,
  testInput,
  onChangeTestInput,
  runOutput,
  onRun,
  running,
}: NodeConfigPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">节点配置</p>
        {!node && <p className="text-xs text-slate-500">请选择画布中的节点</p>}
        {node && (
          <div className="space-y-2">
            <input
              value={node.label}
              onChange={(e) => onUpdateNode({ label: e.target.value })}
              className="h-9 w-full rounded border border-slate-200 px-2 text-sm"
            />
            <textarea
              value={JSON.stringify(node.config, null, 2)}
              onChange={(e) => {
                try {
                  const next = JSON.parse(e.target.value);
                  onUpdateNode({ config: next });
                } catch {
                  // 配置输入允许暂时不合法，保持当前值
                }
              }}
              rows={8}
              className="w-full rounded border border-slate-200 p-2 font-mono text-xs"
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">测试运行</p>
        <textarea
          value={testInput}
          onChange={(e) => onChangeTestInput(e.target.value)}
          rows={4}
          className="w-full rounded border border-slate-200 p-2 text-sm"
        />
        <button
          type="button"
          disabled={running}
          onClick={onRun}
          className="mt-2 h-9 w-full rounded bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50"
        >
          运行编排
        </button>
        <pre className="mt-2 max-h-52 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
          {runOutput || '运行结果将显示在这里'}
        </pre>
      </div>
    </div>
  );
}

