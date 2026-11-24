import { useEffect, useRef } from 'react';

import { fetchAppSetting } from '../shared/api/appSetting';
import { useAuthStore } from '../shared/store/auth';
import { applyTheme, useThemeStore } from '../shared/store/theme';

/** 把主题偏好落到 DOM；system 模式下跟随系统变化 */
export function ThemeEffect() {
  const preference = useThemeStore((state) => state.preference);
  const token = useAuthStore((state) => state.token);
  const syncedRef = useRef(false);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [preference]);

  useEffect(() => {
    if (!token || syncedRef.current) return;
    syncedRef.current = true;
    fetchAppSetting()
      .then((result) => {
        const theme = result.config?.theme;
        if (theme) useThemeStore.getState().setPreference(theme);
      })
      .catch(() => {
        // 服务端配置读取失败时，继续使用本机偏好
      });
  }, [token]);

  return null;
}
