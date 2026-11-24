import type { ThemePreference } from '@xtool/shared';
import { create } from 'zustand';

const THEME_KEY = 'xtool_theme';

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: readPreference(),
  setPreference: (preference) => {
    localStorage.setItem(THEME_KEY, preference);
    set({ preference });
  },
}));

/** 把偏好落到 <html class="dark">；system 跟随 prefers-color-scheme */
export function applyTheme(preference: ThemePreference): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const shouldUseDark = preference === 'dark' || (preference === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', shouldUseDark);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', shouldUseDark ? '#0d0f14' : '#f7f8fa');
}
