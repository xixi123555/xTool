import { KeyRound, Palette, UserRound, Waypoints } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { cn } from '../../shared/lib/cn';
import { isGuest, useAuthStore } from '../../shared/store/auth';
import { Page, PageHeader } from '../../shared/ui/Page';
import { AiKeysSection } from './sections/AiKeysSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { McpKeysSection } from './sections/McpKeysSection';
import { ProfileSection } from './sections/ProfileSection';

type TabId = 'profile' | 'appearance' | 'ai-keys' | 'mcp-keys';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: LucideIcon;
  guestAllowed: boolean;
}

const TABS: TabDefinition[] = [
  { id: 'profile', label: '个人信息', icon: UserRound, guestAllowed: true },
  { id: 'appearance', label: '外观', icon: Palette, guestAllowed: true },
  { id: 'ai-keys', label: 'AI 服务密钥', icon: KeyRound, guestAllowed: false },
  { id: 'mcp-keys', label: 'MCP Key', icon: Waypoints, guestAllowed: false },
];

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const guest = isGuest(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as TabId | null;
  const visibleTabs = TABS.filter((tab) => !guest || tab.guestAllowed);
  const activeTab = visibleTabs.some((tab) => tab.id === requested)
    ? (requested as TabId)
    : 'profile';

  const selectTab = (tab: TabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <Page>
      <PageHeader title="设置" description="账号、外观与外部工具连接。" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="grid grid-cols-2 gap-1 lg:flex lg:flex-col">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition lg:w-full',
                  active
                    ? 'bg-surface font-medium text-fg shadow-card'
                    : 'text-subtle hover:bg-muted hover:text-fg',
                )}
              >
                <Icon className={cn('h-4 w-4', active && 'text-accent')} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {activeTab === 'profile' && <ProfileSection />}
          {activeTab === 'appearance' && <AppearanceSection />}
          {activeTab === 'ai-keys' && !guest && <AiKeysSection />}
          {activeTab === 'mcp-keys' && !guest && <McpKeysSection />}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-subtle">
        xTool ·{' '}
        <Link to="/tools" className="hover:text-fg">
          返回工具
        </Link>
      </p>
    </Page>
  );
}
