import { LogOut } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';

import { cn } from '../lib/cn';
import { useAuthStore, isGuest } from '../store/auth';
import { visibleNavItems, SETTINGS_ITEM } from '../nav';
import { Avatar } from '../ui/Controls';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const groups = visibleNavItems(isGuest(user));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="hidden h-full w-60 flex-shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
          x
        </span>
        <div>
          <p className="text-sm font-semibold leading-tight text-fg">xTool</p>
          <p className="text-[11px] leading-tight text-subtle">个人效率工作台</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
                        isActive
                          ? 'bg-accent-soft font-medium text-accent'
                          : 'text-subtle hover:bg-muted hover:text-fg',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <NavLink
          to={SETTINGS_ITEM.path}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition',
              isActive ? 'bg-accent-soft text-accent' : 'text-subtle hover:bg-muted hover:text-fg',
            )
          }
        >
          <SETTINGS_ITEM.icon className="h-4 w-4" />
          设置
        </NavLink>
        <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-muted px-2.5 py-2">
          <Avatar src={user?.avatar} name={user?.username} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{user?.username ?? '未登录'}</p>
            <p className="text-[11px] text-subtle">{isGuest(user) ? '路人身份' : '已登录'}</p>
          </div>
          <button
            type="button"
            className="btn-ghost h-8 w-8 p-0"
            onClick={handleLogout}
            title="退出登录"
            aria-label="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
