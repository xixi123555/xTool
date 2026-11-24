import type { UserSummary } from '@xtool/shared';
import { create } from 'zustand';

const TOKEN_KEY = 'xtool_token';
const USER_KEY = 'xtool_user';

function readStoredUser(): UserSummary | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserSummary) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: UserSummary | null;
  token: string | null;
  setSession: (token: string, user: UserSummary) => void;
  updateUser: (user: UserSummary) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: readStoredUser(),
  token: localStorage.getItem(TOKEN_KEY),
  setSession: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  updateUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));

export function isGuest(user: UserSummary | null): boolean {
  return user?.user_type === 'guest';
}
