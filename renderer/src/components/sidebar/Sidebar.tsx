import { ReactNode } from 'react';

const NAV_ITEMS: Array<{ id: 'clipboard' | 'json'; label: string; icon: ReactNode }> = [
  { id: 'clipboard', label: '剪贴板历史', icon: '📋' },
  { id: 'json', label: 'JSON 工具', icon: '🧩' },
];

type SidebarProps = {
  activePanel: 'clipboard' | 'json';
  onChange: (panel: 'clipboard' | 'json') => void;
};

export function Sidebar({ activePanel, onChange }: SidebarProps) {
  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white/80 p-6 backdrop-blur">
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">DevTools Suite</h1>
        <p className="text-sm text-slate-500">为开发者打造的多功能工具箱</p>
      </div>
      <nav className="space-y-3">
        {NAV_ITEMS.map((item) => {
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
    </aside>
  );
}
