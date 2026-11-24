import { Check, KeyRound, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  deleteAppKey,
  fetchAppKeys,
  saveAppKey,
  updateAppKey,
  type AppKey,
} from '../../../shared/api/appKey';
import { errorMessage } from '../../../shared/lib/http';
import { confirm, toast } from '../../../shared/store/feedback';
import { Badge } from '../../../shared/ui/Controls';
import { SectionCard, Spinner } from '../../../shared/ui/Page';

const PRESETS = [
  { keyName: 'translation', label: '翻译', description: '翻译页面使用的 Dify 工作流' },
  { keyName: 'web_reader', label: '网页阅读', description: '网页阅读页面使用的 Dify 工作流' },
];

function maskKey(key: string): string {
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function serviceLabel(keyName: string): string {
  return PRESETS.find((preset) => preset.keyName === keyName)?.label ?? keyName;
}

export function AiKeysSection() {
  const [keys, setKeys] = useState<AppKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keyName, setKeyName] = useState('translation');
  const [appKey, setAppKey] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const result = await fetchAppKeys();
      if (!result.success) throw new Error(result.error || '加载失败');
      setKeys(result.appKeys ?? []);
    } catch (error) {
      toast(errorMessage(error, '加载服务密钥失败'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setKeyName('translation');
    setAppKey('');
    setDescription('');
  };

  const startEdit = (item: AppKey) => {
    setEditingId(item.id);
    setKeyName(item.key_name);
    setAppKey(item.app_key);
    setDescription(item.description ?? '');
  };

  const handleSubmit = async () => {
    if (!keyName.trim() || !appKey.trim()) {
      toast('请填写服务标识与密钥', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        const result = await updateAppKey(editingId, {
          keyName: keyName.trim(),
          appKey: appKey.trim(),
          workflowType: keyName.trim(),
          description: description.trim(),
        });
        if (!result.success) throw new Error(result.error || '保存失败');
      } else {
        const result = await saveAppKey({
          keyName: keyName.trim(),
          appKey: appKey.trim(),
          workflowType: keyName.trim(),
          description: description.trim(),
        });
        if (!result.success) throw new Error(result.error || '保存失败');
      }
      toast('密钥已保存', 'success');
      resetForm();
      await load();
    } catch (error) {
      toast(errorMessage(error, '保存失败'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: AppKey) => {
    const confirmed = await confirm({
      title: '删除密钥',
      message: `删除「${serviceLabel(item.key_name)}」后，对应工具会暂时不可用。`,
      confirmText: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const result = await deleteAppKey(item.id);
      if (!result.success) throw new Error(result.error || '删除失败');
      await load();
      toast('密钥已删除', 'success');
    } catch (error) {
      toast(errorMessage(error, '删除失败'), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <SectionCard
        title="AI 服务密钥"
        description="翻译与网页阅读使用 Dify 工作流，密钥只提交到你的服务端。"
      >
        {loading ? (
          <Spinner />
        ) : keys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-subtle">
            还没有配置服务密钥。
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {keys.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-fg">{serviceLabel(item.key_name)}</p>
                    <Badge>{item.key_name}</Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-subtle">
                    {maskKey(item.app_key)}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-[11px] text-subtle">{item.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 p-0"
                  onClick={() => startEdit(item)}
                  aria-label="编辑"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
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

      <SectionCard
        title={editingId ? '编辑密钥' : '添加密钥'}
        description="服务标识需要与工具约定一致：translation / web_reader。"
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.keyName}
              type="button"
              className={`chip ${keyName === preset.keyName ? 'chip-active' : ''}`}
              onClick={() => setKeyName(preset.keyName)}
            >
              {preset.label}
              <span className="text-[10px] opacity-60">{preset.keyName}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ai-key-name">
              服务标识
            </label>
            <input
              id="ai-key-name"
              className="field"
              value={keyName}
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="translation"
            />
          </div>
          <div>
            <label className="label" htmlFor="ai-key-value">
              密钥
            </label>
            <input
              id="ai-key-value"
              className="field font-mono"
              value={appKey}
              onChange={(event) => setAppKey(event.target.value)}
              placeholder="app-..."
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="label" htmlFor="ai-key-description">
            备注 <span className="font-normal text-subtle">（可选）</span>
          </label>
          <input
            id="ai-key-description"
            className="field"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              <X className="h-4 w-4" />
              取消
            </button>
          )}
          <button
            type="button"
            className="btn-primary whitespace-nowrap"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : editingId ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingId ? '保存修改' : '添加密钥'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
