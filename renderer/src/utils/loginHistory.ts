/**
 * 登录历史管理工具
 * 使用 Electron IPC 与主进程通信，数据存储在 Electron 应用中
 */

export interface LoginHistoryItem {
  username?: string;
  email?: string;
  password?: string; // 注意：实际应用中不建议存储密码，这里仅用于自动填充
  lastLoginTime: number;
  loginType: 'password' | 'code' | 'register';
}

/**
 * 获取所有登录历史
 */
export async function getLoginHistory(): Promise<LoginHistoryItem[]> {
  try {
    return (await window.api.invoke('login-history:get-all')) as LoginHistoryItem[];
  } catch (error) {
    console.error('获取登录历史失败:', error);
    return [];
  }
}

/**
 * 保存登录历史
 */
export async function saveLoginHistory(item: Omit<LoginHistoryItem, 'lastLoginTime'>): Promise<void> {
  try {
    await window.api.invoke('login-history:save', item);
  } catch (error) {
    console.error('保存登录历史失败:', error);
  }
}

/**
 * 获取最新的登录历史（用于自动填充）
 */
export async function getLatestLoginHistory(loginType: 'password' | 'code' | 'register'): Promise<LoginHistoryItem | null> {
  try {
    return (await window.api.invoke('login-history:get-latest', loginType)) as LoginHistoryItem | null;
  } catch (error) {
    console.error('获取最新登录历史失败:', error);
    return null;
  }
}

/**
 * 根据用户名或邮箱获取历史记录（用于联想）
 */
export async function getHistoryByKeyword(keyword: string, loginType: 'password' | 'code' | 'register'): Promise<LoginHistoryItem[]> {
  if (!keyword.trim()) return [];
  
  try {
    return (await window.api.invoke('login-history:get-by-keyword', keyword, loginType)) as LoginHistoryItem[];
  } catch (error) {
    console.error('根据关键词获取登录历史失败:', error);
    return [];
  }
}

/**
 * 删除登录历史
 */
export async function deleteLoginHistory(item: LoginHistoryItem): Promise<void> {
  try {
    await window.api.invoke('login-history:delete', item);
  } catch (error) {
    console.error('删除登录历史失败:', error);
  }
}

/**
 * 清除所有登录历史
 */
export async function clearLoginHistory(): Promise<void> {
  try {
    await window.api.invoke('login-history:clear');
  } catch (error) {
    console.error('清除登录历史失败:', error);
  }
}

