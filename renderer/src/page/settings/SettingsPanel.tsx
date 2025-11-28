import { useState } from 'react';
import { AiAuthPanel } from '../ai-auth/AiAuthPanel';
import { ShortcutsPanel } from '../shortcuts/ShortcutsPanel';

type TabId = 'aiAuth' | 'shortcuts';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'aiAuth', label: 'AI 鉴权管理' },
  { id: 'shortcuts', label: '快捷键管理' },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('shortcuts');

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-slate-900">设置</h2>
        <button
          className="text-slate-500 hover:text-slate-700 transition"
          onClick={onClose}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </header>

      {/* Tab 导航 */}
      <div className="border-b border-slate-200 px-6">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'aiAuth' && (
          <div className="h-full overflow-hidden">
            <AiAuthPanel />
          </div>
        )}
        {activeTab === 'shortcuts' && (
          <div className="h-full overflow-hidden">
            <ShortcutsPanel />
          </div>
        )}
      </div>
    </div>
  );
}

