import { Copy, Loader2, Plus, Trash2, Waypoints } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  deleteMcpKey,
  fetchMcpKeys,
  generateMcpKey,
  type McpKeyItem,
} from '../../../shared/api/mcpKey';
import { errorMessage } from '../../../shared/lib/http';
import { confirm, toast } from '../../../shared/store/feedback';
import { SectionCard, Spinner } from '../../../shared/ui/Page';

const MCP_ENDPOINT = import.meta.env.VITE_MCP_URL ?? 'http://localhost:5197/mcp';

export function McpKeysSection() {
  const [keys, setKeys] = useState<McpKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchMcpKeys();
      if (!result.success) throw new Error(result.error || '加载失败');
      setKeys(result.keys ?? []);
    } catch (error) {
      toast(errorMessage(error, '加载 MCP Key 失败'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerated(null);
    try {
      const result = await generateMcpKey();
      if (!result.success || !result.mcpKey) throw new Error(result.error || '生成失败');
      setGenerated(result.mcpKey.key);
      await load();
      toast('已生成，请立即复制', 'success');
    } catch (error) {
      toast(errorMessage(error, '生成失败'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      toast('已复制', 'success');
      setGenerated(null);
    } catch {
      toast('复制失败，请手动复制', 'error');
    }
  };

  const handleDelete = async (item: McpKeyItem) => {
    const confirmed = await confirm({
      title: '删除 MCP Key',
      message: '删除后使用该 key 的客户端会立即失效。',
      confirmText: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const result = await deleteMcpKey(item.id);
      if (!result.success) throw new Error(result.error || '删除失败');
      await load();
      toast('已删除', 'success');
    } catch (error) {
      toast(errorMessage(error, '删除失败'), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <SectionCard
        title="MCP Key"
        description="给 Cursor 等 AI 客户端调用记账、待办与知识库使用。"
        actions={
          <button
            type="button"
            className="btn-primary whitespace-nowrap"
            onClick={() => void handleGenerate()}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            生成
          </button>
        }
      >
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs text-subtle">
          <Waypoints className="h-4 w-4 flex-shrink-0" />
          <span className="min-w-0 flex-1 break-all">MCP 服务地址：{MCP_ENDPOINT}</span>
        </div>

        {generated && (
          <div className="mb-4 rounded-xl border border-accent/40 bg-accent-soft p-3">
            <p className="text-xs font-medium text-accent">新生成的 Key 只显示这一次</p>
            <div className="mt-2 flex gap-2">
              <input className="field font-mono text-xs" value={generated} readOnly />
              <button
                type="button"
                className="btn-primary flex-shrink-0"
                onClick={() => void handleCopy()}
              >
                <Copy className="h-4 w-4" />
                复制
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : keys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-subtle">
            还没有生成 MCP Key。
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {keys.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-subtle">
                  <Waypoints className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-fg">{item.mask}</p>
                  {item.created_at && (
                    <p className="text-[11px] text-subtle">
                      {new Date(item.created_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 p-0 hover:text-danger"
                  onClick={() => void handleDelete(item)}
                  aria-label="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
