import { Moon, Sun, Monitor } from 'lucide-react';
import type { ThemePreference } from '@xtool/shared';
import { THEME_OPTIONS } from '@xtool/shared';

import { saveAppSetting } from '../../../shared/api/appSetting';
import { cn } from '../../../shared/lib/cn';
import { useThemeStore } from '../../../shared/store/theme';
import { toast } from '../../../shared/store/feedback';
import { SectionCard } from '../../../shared/ui/Page';

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function AppearanceSection() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  const handleSelect = (value: ThemePreference) => {
    setPreference(value);
    saveAppSetting(value).catch(() => {
      toast('主题已在本机生效，同步到账号失败', 'error');
    });
  };

  return (
    <SectionCard title="外观" description="主题会同步到账号，并在下次登录时恢复。">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = ICONS[option.value];
          const active = preference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                active
                  ? 'border-accent/50 bg-accent-soft'
                  : 'border-line bg-surface hover:border-accent/30',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  active ? 'bg-accent text-accent-fg' : 'bg-muted text-subtle',
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium text-fg">{option.label}</p>
              <p className="mt-0.5 text-xs text-subtle">{option.description}</p>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
