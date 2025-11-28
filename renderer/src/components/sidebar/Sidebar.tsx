import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../toast/Toast';
import { routes } from '../../router';

type SidebarProps = {
  onSettingsClick: () => void;
};

export function Sidebar({ onSettingsClick }: SidebarProps) {
  const { user, logout, canUseFeature } = useAppStore();

  const handleLogout = () => {
    logout();
    showToast('已退出登录');
  };

  // 根据用户权限过滤导航项
  const navItems = routes.filter((route) => {
    // 如果是路人用户，检查 isShowForGuest 属性
    if (user?.user_type === 'guest') {
      if (route.isShowForGuest === false) {
        return false;
      }
    }

    // 检查是否需要认证
    if (route.requiresAuth) {
      if (route.path === '/translation') {
        return canUseFeature('translation');
      }
      if (route.path === '/web-reader') {
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
        {navItems.map((route) => (
          <NavLink
            key={route.path}
            to={route.path}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-soft'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <span className="text-lg">{route.icon}</span>
            <span>{route.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {user?.user_type === 'guest' ? '路人身份' : user?.username}
          </span>
          <button
            className="text-slate-500 hover:text-slate-700 transition p-1"
            onClick={onSettingsClick}
            title="设置"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
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
