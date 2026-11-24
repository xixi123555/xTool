import { NavLink } from 'react-router-dom';

import { cn } from '../lib/cn';
import { MOBILE_TABS } from '../nav';

export function MobileTabBar() {
  return (
    <nav className="safe-bottom flex h-16 flex-shrink-0 items-stretch border-t border-line bg-surface md:hidden">
      {MOBILE_TABS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition',
                isActive ? 'font-medium text-accent' : 'text-subtle',
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function MobileTopBar() {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-surface px-4 md:hidden">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-fg">
          x
        </span>
        <span className="text-sm font-semibold text-fg">xTool</span>
      </div>
    </header>
  );
}
