import type Store from 'electron-store';

let storeConstructorPromise: Promise<typeof Store> | undefined;

async function resolveStoreConstructor() {
  if (!storeConstructorPromise) {
    storeConstructorPromise = import('electron-store').then((module) => module.default);
  }
  return storeConstructorPromise;
}

export interface LoginHistoryItem {
  username?: string;
  email?: string;
  password?: string; // 注意：实际应用中不建议存储密码，这里仅用于自动填充
  lastLoginTime: number;
  loginType: 'password' | 'code' | 'register';
}

interface LoginHistoryStoreData {
  history: LoginHistoryItem[];
}

class LoginHistoryStore {
  private storePromise: Promise<Store<LoginHistoryStoreData>>;
  private MAX_HISTORY_COUNT = 10; // 最多保存10条历史记录

  constructor() {
    this.storePromise = this.createStore();
  }

  private async createStore() {
    const Store = await resolveStoreConstructor();
    return new Store<LoginHistoryStoreData>({
      name: 'login-history',
      defaults: {
        history: [],
      },
    });
  }

  /**
   * 获取所有登录历史
   */
  async getAll(): Promise<LoginHistoryItem[]> {
    const store = await this.storePromise;
    const data = store.get('history', []);
    // 按最后登录时间排序，最新的在前
    return [...data].sort((a, b) => b.lastLoginTime - a.lastLoginTime);
  }

  /**
   * 保存登录历史
   */
  async save(item: Omit<LoginHistoryItem, 'lastLoginTime'>): Promise<void> {
    const history = await this.getAll();
    
    // 查找是否已存在相同的记录（根据登录类型和用户名/邮箱）
    const existingIndex = history.findIndex((h) => {
      if (item.loginType === 'password' && h.loginType === 'password') {
        return h.username === item.username;
      }
      if (item.loginType === 'code' && h.loginType === 'code') {
        return h.email === item.email;
      }
      if (item.loginType === 'register' && h.loginType === 'register') {
        return h.username === item.username;
      }
      return false;
    });

    const newItem: LoginHistoryItem = {
      ...item,
      lastLoginTime: Date.now(),
    };

    if (existingIndex >= 0) {
      // 更新现有记录
      history[existingIndex] = newItem;
    } else {
      // 添加新记录
      history.unshift(newItem);
    }

    // 限制历史记录数量
    const limitedHistory = history.slice(0, this.MAX_HISTORY_COUNT);
    
    const store = await this.storePromise;
    store.set('history', limitedHistory);
  }

  /**
   * 获取最新的登录历史（用于自动填充）
   */
  async getLatest(loginType: 'password' | 'code' | 'register'): Promise<LoginHistoryItem | null> {
    const history = await this.getAll();
    const filtered = history.filter((h) => h.loginType === loginType);
    return filtered.length > 0 ? filtered[0] : null;
  }

  /**
   * 根据关键词获取历史记录（用于联想）
   */
  async getByKeyword(keyword: string, loginType: 'password' | 'code' | 'register'): Promise<LoginHistoryItem[]> {
    if (!keyword.trim()) return [];
    
    const history = await this.getAll();
    const filtered = history.filter((h) => {
      if (h.loginType !== loginType) return false;
      const lowerKeyword = keyword.toLowerCase();
      if (loginType === 'code') {
        return h.email?.toLowerCase().includes(lowerKeyword);
      }
      return h.username?.toLowerCase().includes(lowerKeyword);
    });
    
    // 返回最多5条匹配的记录
    return filtered.slice(0, 5);
  }

  /**
   * 删除登录历史
   */
  async delete(item: LoginHistoryItem): Promise<void> {
    const history = await this.getAll();
    const filtered = history.filter((h) => {
      if (item.loginType === 'password' && h.loginType === 'password') {
        return h.username !== item.username;
      }
      if (item.loginType === 'code' && h.loginType === 'code') {
        return h.email !== item.email;
      }
      if (item.loginType === 'register' && h.loginType === 'register') {
        return h.username !== item.username;
      }
      return true;
    });
    const store = await this.storePromise;
    store.set('history', filtered);
  }

  /**
   * 清除所有登录历史
   */
  async clear(): Promise<void> {
    const store = await this.storePromise;
    store.set('history', []);
  }
}

export const loginHistoryStore = new LoginHistoryStore();
