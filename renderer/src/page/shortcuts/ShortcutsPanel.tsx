import { useState, useEffect } from 'react';
import { showToast } from '../../components/toast/Toast';
import { post } from '../../utils/http';

interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  shortcut: string;
  action: string;
}

export function ShortcutsPanel() {
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([
    {
      id: 'screenshot',
      name: '截图',
      description: '快速启动截图功能',
      shortcut: '',
      action: 'screenshot',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingShortcut, setEditingShortcut] = useState('');

  // 加载快捷键
  const loadShortcuts = async () => {
    setLoading(true);
    try {
      const screenshotShortcut = (await window.api.invoke('shortcut:get-screenshot')) as string;
      setShortcuts((prev) =>
        prev.map((s) => (s.id === 'screenshot' ? { ...s, shortcut: screenshotShortcut } : s))
      );
    } catch (error: any) {
      console.error('加载快捷键失败:', error);
      showToast('加载快捷键失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShortcuts();
  }, []);

  // 开始编辑
  const handleStartEdit = (id: string, currentShortcut: string) => {
    setEditingId(id);
    setEditingShortcut(currentShortcut);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingShortcut('');
  };

  // 保存快捷键
  const handleSaveShortcut = async (id: string) => {
    if (!editingShortcut.trim()) {
      showToast('快捷键不能为空');
      return;
    }

    setLoading(true);
    try {
      if (id === 'screenshot') {
        const result = (await window.api.invoke('shortcut:update-screenshot', editingShortcut)) as {
          success: boolean;
          error?: string;
          shortcut?: string;
        };

        if (result.success) {
          setShortcuts((prev) =>
            prev.map((s) => (s.id === id ? { ...s, shortcut: result.shortcut || editingShortcut } : s))
          );
          showToast('快捷键更新成功');
          setEditingId(null);
          setEditingShortcut('');
          
          // 保存到服务器
          try {
            await post('http://localhost:5198/api/shortcut/save', {
              actionName: 'screenshot',
              shortcut: result.shortcut || editingShortcut,
            });
          } catch (error) {
            console.error('保存快捷键到服务器失败:', error);
            // 不显示错误提示，因为本地已经更新成功
          }
        } else {
          showToast(result.error || '更新失败');
        }
      }
    } catch (error: any) {
      console.error('保存快捷键失败:', error);
      showToast('保存快捷键失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理键盘输入
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 如果只按了修饰键，不处理
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
      return;
    }

    const parts: string[] = [];

    // Electron 快捷键格式：CommandOrControl, Alt, Shift
    // macOS 上 Command，其他平台 Ctrl
    if (e.metaKey || e.ctrlKey) {
      // 在 Electron 中，CommandOrControl 会自动处理平台差异
      // 但我们需要根据实际按下的键来决定
      if (e.metaKey) {
        parts.push('Command');
      } else {
        parts.push('Ctrl');
      }
    }
    
    if (e.altKey) {
      parts.push('Alt');
    }
    if (e.shiftKey) {
      parts.push('Shift');
    }

    // 处理主键
    let key = e.key;
    if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
      key = key.toUpperCase();
    } else {
      // 处理特殊键
      const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Enter': 'Enter',
        'Escape': 'Esc',
        'Tab': 'Tab',
        'Backspace': 'Backspace',
        'Delete': 'Delete',
        'Insert': 'Insert',
        'Home': 'Home',
        'End': 'End',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
      };

      if (key.startsWith('Key')) {
        key = key.replace('Key', '');
      } else if (key.startsWith('Digit')) {
        key = key.replace('Digit', '');
      } else if (key.startsWith('F') && /^F\d+$/.test(key)) {
        // F1-F12
        key = key;
      } else if (keyMap[key]) {
        key = keyMap[key];
      } else {
        // 其他未映射的键，尝试清理
        key = key.replace(/^[a-z]/, (char) => char.toUpperCase());
      }
    }

    if (key && !parts.includes(key)) {
      parts.push(key);
    }

    if (parts.length > 0) {
      // Electron 使用 + 连接
      const shortcut = parts.join('+');
      setEditingShortcut(shortcut);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">快捷键管理</h3>
        <p className="text-sm text-slate-500">管理应用的全局快捷键</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">{shortcut.name}</h4>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{shortcut.description}</p>
                  
                  {editingId === shortcut.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        placeholder="按下快捷键..."
                        value={editingShortcut}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        readOnly
                      />
                      <button
                        className="btn-primary text-sm px-4 py-2"
                        onClick={() => handleSaveShortcut(shortcut.id)}
                        disabled={loading || !editingShortcut.trim()}
                      >
                        保存
                      </button>
                      <button
                        className="btn-secondary text-sm px-4 py-2"
                        onClick={handleCancelEdit}
                        disabled={loading}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-100 transition"
                        onClick={() => handleStartEdit(shortcut.id, shortcut.shortcut)}
                      >
                        {shortcut.shortcut || '点击变更'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

