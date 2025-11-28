import { useState, useEffect } from 'react';
import { showToast } from '../../components/toast/Toast';
import { saveShortcut } from '../../api/shortcut';
import { useAppStore } from '../../store/useAppStore';

interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  shortcut: string;
  action: string;
}

export function ShortcutsPanel() {
  const { user } = useAppStore();
  const isGuest = user?.user_type === 'guest';
  
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([
    {
      id: 'screenshot',
      name: '截图',
      description: '快速启动截图功能',
      shortcut: '',
      action: 'screenshot',
    },
    {
      id: 'openSettings',
      name: '打开设置',
      description: '打开设置页面',
      shortcut: '',
      action: 'openSettings',
    },
    {
      id: 'showClipboard',
      name: '显示剪贴板历史',
      description: '显示窗口并跳转到剪贴板历史',
      shortcut: '',
      action: 'showClipboard',
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
      const openSettingsShortcut = (await window.api.invoke('shortcut:get-open-settings')) as string;
      const showClipboardShortcut = (await window.api.invoke('shortcut:get-show-clipboard')) as string;
      setShortcuts((prev) =>
        prev.map((s) => {
          if (s.id === 'screenshot') {
            return { ...s, shortcut: screenshotShortcut };
          } else if (s.id === 'openSettings') {
            return { ...s, shortcut: openSettingsShortcut };
          } else if (s.id === 'showClipboard') {
            return { ...s, shortcut: showClipboardShortcut };
          }
          return s;
        })
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
    if (isGuest) {
      showToast('路人身份无法修改快捷键');
      return;
    }
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
          errorContent?: any;
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
            await saveShortcut({
              actionName: 'screenshot',
              shortcut: result.shortcut || editingShortcut,
            });
          } catch (error) {
            console.error('保存快捷键到服务器失败:', error);
            // 不显示错误提示，因为本地已经更新成功
          }
        } else {
          console.error('更新快捷键失败:', result.errorContent);
          showToast(result.error || '更新失败');
        }
      } else if (id === 'openSettings') {
        const result = (await window.api.invoke('shortcut:update-open-settings', editingShortcut)) as {
          success: boolean;
          error?: string;
          shortcut?: string;
          errorContent?: any;
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
            await saveShortcut({
              actionName: 'openSettings',
              shortcut: result.shortcut || editingShortcut,
            });
          } catch (error) {
            console.error('保存快捷键到服务器失败:', error);
            // 不显示错误提示，因为本地已经更新成功
          }
        } else {
          console.error('更新快捷键失败:', result.errorContent);
          showToast(result.error || '更新失败');
        }
      } else if (id === 'showClipboard') {
        const result = (await window.api.invoke('shortcut:update-show-clipboard', editingShortcut)) as {
          success: boolean;
          error?: string;
          shortcut?: string;
          errorContent?: any;
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
            await saveShortcut({
              actionName: 'showClipboard',
              shortcut: result.shortcut || editingShortcut,
            });
          } catch (error) {
            console.error('保存快捷键到服务器失败:', error);
            // 不显示错误提示，因为本地已经更新成功
          }
        } else {
          console.error('更新快捷键失败:', result.errorContent);
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

    // 使用 e.code 而不是 e.key，因为 e.code 表示物理按键，不受 Option 键特殊字符影响
    // e.code 格式：KeyA, KeyB, Digit1, ArrowUp 等
    let key = e.code;
    
    // 将 code 转换为 Electron 支持的格式
    if (key.startsWith('Key')) {
      // KeyA -> A, KeyB -> B
      key = key.replace('Key', '');
    } else if (key.startsWith('Digit')) {
      // Digit1 -> 1, Digit2 -> 2
      key = key.replace('Digit', '');
    } else if (key.startsWith('Numpad')) {
      // Numpad0 -> Num0, Numpad1 -> Num1
      key = 'Num' + key.replace('Numpad', '');
    } else {
      // 处理其他特殊键
      const codeMap: Record<string, string> = {
        'Space': 'Space',
        'Enter': 'Enter',
        'Tab': 'Tab',
        'Escape': 'Esc',
        'Backspace': 'Backspace',
        'Delete': 'Delete',
        'Insert': 'Insert',
        'Home': 'Home',
        'End': 'End',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'F1': 'F1',
        'F2': 'F2',
        'F3': 'F3',
        'F4': 'F4',
        'F5': 'F5',
        'F6': 'F6',
        'F7': 'F7',
        'F8': 'F8',
        'F9': 'F9',
        'F10': 'F10',
        'F11': 'F11',
        'F12': 'F12',
        'F13': 'F13',
        'F14': 'F14',
        'F15': 'F15',
        'F16': 'F16',
        'F17': 'F17',
        'F18': 'F18',
        'F19': 'F19',
        'F20': 'F20',
        'F21': 'F21',
        'F22': 'F22',
        'F23': 'F23',
        'F24': 'F24',
      };

      if (codeMap[key]) {
        key = codeMap[key];
      } else {
        // 不支持的键，不处理
        console.warn('不支持的键:', key);
        return;
      }
    }

    // 验证键是否有效（只允许字母、数字和已知的特殊键）
    const validKeys = new Set([
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
      'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
      'Space', 'Enter', 'Tab', 'Esc', 'Backspace', 'Delete',
      'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown',
      'Insert', 'Clear', 'Return',
      'Num0', 'Num1', 'Num2', 'Num3', 'Num4', 'Num5', 'Num6', 'Num7', 'Num8', 'Num9',
      'NumMultiply', 'NumAdd', 'NumSubtract', 'NumDecimal', 'NumDivide',
    ]);

    if (!validKeys.has(key)) {
      console.warn('无效的快捷键字符:', key);
      showToast(`不支持的键，请使用字母、数字或功能键`);
      return;
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
                        disabled={isGuest}
                      />
                      <button
                        className="btn-primary text-sm px-4 py-2"
                        onClick={() => handleSaveShortcut(shortcut.id)}
                        disabled={loading || !editingShortcut.trim() || isGuest}
                      >
                        保存
                      </button>
                      <button
                        className="btn-secondary text-sm px-4 py-2"
                        onClick={handleCancelEdit}
                        disabled={loading || isGuest}
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition ${
                          isGuest 
                            ? 'cursor-not-allowed opacity-60' 
                            : 'cursor-pointer hover:bg-slate-100'
                        }`}
                        onClick={() => handleStartEdit(shortcut.id, shortcut.shortcut)}
                        title={isGuest ? '路人身份无法修改快捷键' : ''}
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

