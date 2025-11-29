import { ipcMain } from 'electron';
import { loginHistoryStore, type LoginHistoryItem } from './store';

export const loginHistoryEventOn = () => {
  /**
   * 获取所有登录历史
   */
  ipcMain.handle('login-history:get-all', async () => {
    return await loginHistoryStore.getAll();
  });

  /**
   * 保存登录历史
   */
  ipcMain.handle(
    'login-history:save',
    async (_event, item: Omit<LoginHistoryItem, 'lastLoginTime'>) => {
      await loginHistoryStore.save(item);
      return { success: true };
    }
  );

  /**
   * 获取最新的登录历史（用于自动填充）
   */
  ipcMain.handle(
    'login-history:get-latest',
    async (_event, loginType: 'password' | 'code' | 'register') => {
      return await loginHistoryStore.getLatest(loginType);
    }
  );

  /**
   * 根据关键词获取历史记录（用于联想）
   */
  ipcMain.handle(
    'login-history:get-by-keyword',
    async (_event, keyword: string, loginType: 'password' | 'code' | 'register') => {
      return await loginHistoryStore.getByKeyword(keyword, loginType);
    }
  );

  /**
   * 删除登录历史
   */
  ipcMain.handle('login-history:delete', async (_event, item: LoginHistoryItem) => {
    await loginHistoryStore.delete(item);
    return { success: true };
  });

  /**
   * 清除所有登录历史
   */
  ipcMain.handle('login-history:clear', async () => {
    await loginHistoryStore.clear();
    return { success: true };
  });
};

