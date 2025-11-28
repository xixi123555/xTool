import { useState, useEffect, useRef } from 'react';
import { showToast } from '../../components/toast/Toast';
import { getAllAppKeys, saveAppKey, updateAppKey, deleteAppKey } from '../../api/appKey';
import { useAppStore } from '../../store/useAppStore';

interface AppKey {
  id: number;
  key_name: string;
  app_key: string;
  workflow_type: string;
  description?: string | null;
}

// 内联编辑组件
function EditableField({
  value,
  placeholder,
  onSave,
  multiline = false,
  className = '',
  disabled = false,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing && !disabled) {
    const InputComponent = multiline ? 'textarea' : 'input';
    return (
      <InputComponent
        ref={inputRef as any}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 ${className}`}
        rows={multiline ? 2 : undefined}
      />
    );
  }

  const displayValue = value || placeholder;
  const isEmpty = !value;

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer rounded px-2 py-1 text-sm transition hover:bg-slate-50 ${isEmpty ? 'text-slate-400 italic' : ''} ${className}`}
      title={isEmpty ? placeholder : value}
    >
      {displayValue}
    </div>
  );
}

export function AiAuthPanel() {
  const { user } = useAppStore();
  const isGuest = user?.user_type === 'guest';
  
  const [appKeys, setAppKeys] = useState<AppKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    keyName: '',
    appKey: '',
    workflowType: '',
    description: '',
  });

  // 加载所有 appKeys
  const loadAppKeys = async () => {
    setLoading(true);
    try {
      const response = await getAllAppKeys();
      if (response.success && response.appKeys) {
        setAppKeys(response.appKeys);
      }
    } catch (error: any) {
      console.error('加载 AppKeys 失败:', error);
      showToast(error.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppKeys();
  }, []);

  // 重置表单
  const resetForm = () => {
    setFormData({
      keyName: '',
      appKey: '',
      workflowType: '',
      description: '',
    });
    setShowForm(false);
  };

  // 打开添加表单
  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  // 保存（新增）
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.appKey || !formData.keyName) {
      showToast('请填写完整信息');
      return;
    }

    setLoading(true);
    try {
        await saveAppKey(formData);
      showToast('添加成功');
      resetForm();
      loadAppKeys();
    } catch (error: any) {
      console.error('保存失败:', error);
      showToast(error.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新字段
  const handleFieldUpdate = async (id: number, field: string, value: string) => {
    const key = appKeys.find((k) => k.id === id);
    if (!key) return;

    const updateData: any = {
      keyName: key.key_name,
      appKey: key.app_key,
      workflowType: key.workflow_type || '',
      description: key.description || '',
    };

    // 更新对应字段
    if (field === 'keyName') {
      updateData.keyName = value;
    } else if (field === 'workflowType') {
      updateData.workflowType = value;
    } else if (field === 'description') {
      updateData.description = value;
    } else if (field === 'appKey') {
      updateData.appKey = value;
    }

    try {
      await updateAppKey(id, updateData);
      showToast('更新成功');
      loadAppKeys();
    } catch (error: any) {
      console.error('更新失败:', error);
      showToast(error.response?.data?.error || '更新失败');
      loadAppKeys(); // 重新加载以恢复原值
    }
  };

  // 删除
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个 AppKey 吗？')) {
      return;
    }

    setLoading(true);
    try {
      await deleteAppKey(id);
      showToast('删除成功');
      loadAppKeys();
    } catch (error: any) {
      console.error('删除失败:', error);
      showToast(error.response?.data?.error || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制 AppKey
  const handleCopy = async (appKey: string) => {
    try {
      await navigator.clipboard.writeText(appKey);
      showToast('已复制到剪贴板');
    } catch (error) {
      showToast('复制失败');
    }
  };

  return (
    <section className="flex flex-col h-full overflow-hidden p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">管理 Dify 工作流的 API Key</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleAdd}
          disabled={loading || showForm || isGuest}
          title={isGuest ? '路人身份无法添加 AppKey' : ''}
        >
          + 添加 AppKey
        </button>
      </header>

      {/* 表单 */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">添加 AppKey</h3>
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={resetForm}
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                名称 (key_name)
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="例如: translation, web_reader"
                value={formData.keyName}
                onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                工作流类型 (workflow_type)
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="例如: translation, web_reader"
                value={formData.workflowType}
                onChange={(e) => setFormData({ ...formData, workflowType: e.target.value })}
                required
                disabled={loading || isGuest}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                AppKey
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入 Dify API Key"
                value={formData.appKey}
                onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                rows={3}
                required
                disabled={loading || isGuest}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                描述 <span className="text-slate-400 text-xs">(可选)</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="描述该 AppKey 的用途..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                disabled={loading || isGuest}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || isGuest}
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={resetForm}
                disabled={loading}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading && !showForm ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">加载中...</div>
          </div>
        ) : appKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-4">🔑</div>
            <div className="text-slate-500 mb-2">暂无 AppKey</div>
            <div className="text-sm text-slate-400">点击上方按钮添加</div>
          </div>
        ) : (
          <div className="space-y-3">
            {appKeys.map((key) => (
              <div
                key={key.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* 名称和标签 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <EditableField
                        value={key.key_name}
                        placeholder="点击变更"
                        onSave={(value) => handleFieldUpdate(key.id, 'keyName', value)}
                        className="font-semibold text-slate-900"
                        disabled={isGuest}
                      />
                      <EditableField
                        value={key.workflow_type || ''}
                        placeholder="点击变更"
                        onSave={(value) => handleFieldUpdate(key.id, 'workflowType', value)}
                        className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600 min-w-[80px]"
                        disabled={isGuest}
                      />
                      <EditableField
                        value={key.description || ''}
                        placeholder="点击变更"
                        onSave={(value) => handleFieldUpdate(key.id, 'description', value)}
                        className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-600 min-w-[80px]"
                        disabled={isGuest}
                      />
                    </div>

                    {/* AppKey */}
                    <div className="flex items-center gap-2">
                      <EditableField
                        value={key.app_key}
                        placeholder="点击变更"
                        onSave={(value) => handleFieldUpdate(key.id, 'appKey', value)}
                        multiline
                        className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded flex-1 min-w-0"
                        disabled={isGuest}
                      />
                      <button
                        className="btn-secondary text-xs px-2 py-1 shrink-0"
                        onClick={() => handleCopy(key.app_key)}
                        title="复制"
                      >
                        复制
                      </button>
                    </div>
                  </div>
                  
                  {/* 删除按钮 */}
                  <button
                    className={`rounded p-2 transition shrink-0 ${
                      isGuest 
                        ? 'text-slate-400 cursor-not-allowed opacity-60' 
                        : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                    }`}
                    onClick={() => !isGuest && handleDelete(key.id)}
                    disabled={loading || isGuest}
                    title={isGuest ? '路人身份无法删除' : '删除'}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
