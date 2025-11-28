import { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../toast/Toast';

const ALL_NAV_ITEMS: Array<{ id: 'clipboard' | 'json' | 'screenshotHistory' | 'todoList' | 'translation' | 'webReader' | 'aiAuth'; label: string; icon: ReactNode; requiresAuth?: boolean }> = [
  { id: 'clipboard', label: '剪贴板历史', icon: '📋' },
  { id: 'json', label: 'JSON 工具', icon: '🧩' },
  { id: 'screenshotHistory', label: '截图历史', icon: '📷' },
  { id: 'todoList', label: '待办事项', icon: '✓' },
  { id: 'translation', label: '翻译', icon: '🤖', requiresAuth: true },
  { id: 'webReader', label: '网页阅读器', icon: '📄', requiresAuth: true },
  { id: 'aiAuth', label: 'AI 鉴权管理', icon: '🔑' },
];

type SidebarProps = {
  activePanel: 'clipboard' | 'json' | 'screenshotHistory' | 'todoList' | 'translation' | 'webReader' | 'aiAuth';
  onChange: (panel: 'clipboard' | 'json' | 'screenshotHistory' | 'todoList' | 'translation' | 'webReader' | 'aiAuth') => void;
};

export function Sidebar({ activePanel, onChange }: SidebarProps) {
  const { user, logout, canUseFeature } = useAppStore();

  const handleLogout = () => {
    logout();
    showToast('已退出登录');
  };

  // 根据用户权限过滤导航项
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (item.requiresAuth) {
      if (item.id === 'translation') {
        return canUseFeature('translation');
      }
      if (item.id === 'webReader') {
        return canUseFeature('web_reader');
      }
    }
    return true;
  });

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white/80 p-6 backdrop-blur">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">xTool</h1>
        <p className="text-sm text-slate-500">多种实用工具</p>
      </div>
      <nav className="space-y-3 flex-1">
        {navItems.map((item) => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-soft'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => onChange(item.id)}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-200">
        <div className="mb-3 text-xs text-slate-500">
          {user?.user_type === 'guest' ? '路人身份' : user?.username}
        </div>
        <button
          className="btn-secondary w-full text-sm"
          onClick={handleLogout}
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
