import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../../components/toast/Toast';
import { confirm } from '../../components/confirm';
import { DeleteIcon } from '../../assets/icons';
import type { McpKeyItem } from '../../api/mcpKey';
import { deleteMcpKey, generateMcpKey, getAllMcpKeys } from '../../api/mcpKey';

type GeneratedKeyDisplay = {
  key: string;
  mask: string;
  created_at?: Date;
};

function formatDate(value?: Date): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '';
  }
}

export function McpKeyPanel(): JSX.Element {
  const { user } = useAppStore();
  const isGuest = useMemo(() => user?.user_type === 'guest', [user]);

  const [keys, setKeys] = useState<McpKeyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 明文只显示一次（生成后可复制，复制成功后清除）
  const [generated, setGenerated] = useState<GeneratedKeyDisplay | null>(null);

  const loadKeys = async (): Promise<void> => {
    if (!user || isGuest) {
      setKeys([]);
      setGenerated(null);
      return;
    }

    setLoading(true);
    try {
      const response = await getAllMcpKeys();
      if (response.success && response.keys) {
        setKeys(response.keys);
      } else {
        showToast(response.error || '获取 MCP Key 失败');
      }
    } catch (error: any) {
      showToast(error?.response?.data?.error || '获取 MCP Key 失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isGuest]);

  const handleGenerate = async (): Promise<void> => {
    if (!user || isGuest) {
      showToast('路人身份无法生成 MCP Key');
      return;
    }

    setGenerating(true);
    setGenerated(null);
    try {
      const response = await generateMcpKey();
      if (response.success && response.mcpKey) {
        setGenerated({
          key: response.mcpKey.key,
          mask: response.mcpKey.mask,
          created_at: response.mcpKey.created_at,
        });
        await loadKeys();
        showToast('MCP Key 已生成，请立即复制保存');
      } else {
        showToast(response.error || '生成失败');
      }
    } catch (error: any) {
      showToast(error?.response?.data?.error || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!generated?.key) return;
    try {
      await navigator.clipboard.writeText(generated.key);
      showToast('已复制到剪贴板');
      // 复制成功后清空明文，符合“只显示一次”要求
      setGenerated(null);
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    const confirmed = await confirm({
      title: '确认删除',
      message: '确定要删除这个 MCP Key 吗？删除后该 key 将立即失效。',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await deleteMcpKey(id);
      if (response.success) {
        showToast('删除成功');
        await loadKeys();
      } else {
        showToast(response.error || '删除失败');
      }
    } catch (error: any) {
      showToast(error?.response?.data?.error || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-base font-medium text-slate-900 mb-1">MCP Key</h4>
          <p className="text-sm text-slate-500 mb-4">
            为 MCP 调用生成永久鉴权 key。每个账号最多生成 10 个，可随时删除。
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={isGuest || loading || generating}
          title={isGuest ? '路人身份不允许生成 MCP Key' : ''}
        >
          {generating ? '生成中...' : '+ 生成 MCP Key'}
        </button>
      </div>

      {generated && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium text-slate-900">新生成的 MCP Key（仅显示一次）</div>
              <div className="text-xs text-slate-500 mt-1">
                掩码：{generated.mask} {generated.created_at ? `· ${formatDate(generated.created_at)}` : ''}
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setGenerated(null)} disabled={generating}>
              关闭
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <input
              className="flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              value={generated.key}
              readOnly
            />
            <button className="btn-secondary px-4" onClick={handleCopy} disabled={generating}>
              复制
            </button>
          </div>

          <div className="text-xs text-slate-500 mt-2">
            复制后建议立刻替换 `/.cursor/mcp.json` 里的 `XTOOL_JWT_TOKEN` 为该 key。
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-900">已生成的 Key</div>
          <div className="text-xs text-slate-500">{loading ? '加载中...' : `共 ${keys.length} 个`}</div>
        </div>

        {keys.length === 0 ? (
          <div className="text-sm text-slate-500 italic py-6">暂无 MCP Key</div>
        ) : (
          <div className="flex flex-col gap-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{k.mask}</div>
                  {k.created_at && <div className="text-xs text-slate-500 mt-1">{formatDate(k.created_at)}</div>}
                </div>
                <button
                  className="text-slate-400 hover:text-red-600 transition"
                  onClick={() => void handleDelete(k.id)}
                  disabled={loading || generating}
                  aria-label="删除 MCP Key"
                  title="删除该 Key"
                >
                  <DeleteIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

