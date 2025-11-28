import { create } from 'zustand';
import { ClipboardItem } from 'devtools-suite-shared';

type User = {
  id: number;
  username: string;
  email?: string;
  user_type: 'normal' | 'guest';
};

type AppState = {
  clipboardHistory: ClipboardItem[];
  addClipboardItem: (item: ClipboardItem) => void;
  setClipboardHistory: (items: ClipboardItem[]) => void;
  // 用户状态
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  // 检查用户是否有权限使用功能
  canUseFeature: (feature: 'translation' | 'web_reader') => boolean;
};

export const useAppStore = create<AppState>((set, get) => ({
  clipboardHistory: [],
  addClipboardItem: (item) =>
    set((state) => ({
      clipboardHistory: [item, ...state.clipboardHistory.filter((existing) => existing.id !== item.id)].slice(0, 100),
    })),
  setClipboardHistory: (items) => set({ clipboardHistory: items }),
  // 用户状态
  user: null,
  token: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem('xtool_token');
    localStorage.removeItem('xtool_user');
  },
  // 检查权限：路人用户不能使用翻译和网页阅读器
  canUseFeature: (feature) => {
    const { user } = get();
    if (!user) return false;
    if (user.user_type === 'guest' && (feature === 'translation' || feature === 'web_reader')) {
      return false;
    }
    return true;
  },
}));
