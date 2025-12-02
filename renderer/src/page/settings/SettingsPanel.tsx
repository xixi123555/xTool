import { useState } from 'react';
import { AiAuthPanel } from '../ai-auth/AiAuthPanel';
import { ShortcutsPanel } from '../shortcuts/ShortcutsPanel';
import { ProfilePanel } from '../profile/ProfilePanel';
import { AppSettingPanel } from '../app-setting/AppSettingPanel';
import { useAppStore } from '../../store/useAppStore';

type TabId = 'profile' | 'aiAuth' | 'shortcuts' | 'appSetting';

const TABS: Array<{ id: TabId; label: string; showForGuest?: boolean }> = [
  { id: 'profile', label: '个人信息', showForGuest: false },
  { id: 'aiAuth', label: 'AI 鉴权管理', showForGuest: false },
  { id: 'shortcuts', label: '快捷键管理', showForGuest: false },
  { id: 'appSetting', label: '应用配置', showForGuest: false },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAppStore();
  const isGuest = user?.user_type === 'guest';
  
  // 过滤掉路人用户不可见的 tab
  const visibleTabs = TABS.filter((tab) => !isGuest || tab.showForGuest !== false);
  
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    // 如果是路人用户，默认选择 shortcuts（如果可见）
    if (isGuest) {
      return visibleTabs.find((tab) => tab.id === 'shortcuts')?.id || visibleTabs[0]?.id || 'shortcuts';
    }
    return 'profile';
  });

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
          {visibleTabs.map((tab) => (
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
        {activeTab === 'profile' && (
          <div className="h-full overflow-hidden">
            <ProfilePanel />
          </div>
        )}
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
        {activeTab === 'appSetting' && (
          <div className="h-full overflow-hidden">
            <AppSettingPanel />
          </div>
        )}
      </div>
    </div>
  );
}

