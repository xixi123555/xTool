/**
 * 应用配置 API
 */
import { get, put } from '../utils/http';

export interface AppConfig {
  use_local_data: boolean;
}

export interface AppSettingResponse {
  success: boolean;
  config?: AppConfig;
  message?: string;
  error?: string;
}

/**
 * 获取用户的应用配置
 */
export async function getAppSetting(): Promise<AppSettingResponse> {
  return get<AppSettingResponse>('/appsetting');
}

/**
 * 更新用户的应用配置
 */
export async function updateAppSetting(config: AppConfig): Promise<AppSettingResponse> {
  return put<AppSettingResponse>('/appsetting', config);
}

