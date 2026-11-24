import type { ThemePreference } from '@xtool/shared';

import { get, put } from '../lib/http';

interface AppSettingResponse {
  success: boolean;
  config?: { theme: ThemePreference };
  error?: string;
}

export function fetchAppSetting(): Promise<AppSettingResponse> {
  return get('/appsetting');
}

export function saveAppSetting(theme: ThemePreference): Promise<AppSettingResponse> {
  return put('/appsetting', { theme });
}
