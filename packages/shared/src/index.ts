/**
 * 前后端共用的领域类型。
 *
 * 仅放纯类型与常量，不引入任何运行时依赖，保证服务端、Web、MCP 都能安全引用。
 */

export type ThemePreference = 'light' | 'dark' | 'system';

export type UserRole = 'normal' | 'guest';

export interface UserSummary {
  id: number;
  username: string;
  email?: string | null;
  avatar?: string | null;
  user_type: UserRole;
}

export type BookkeepingType = 'expense' | 'income';

export interface BookkeepingRecord {
  id: number;
  user_id: number;
  purpose: string;
  description: string;
  amount: number;
  type: BookkeepingType;
  record_date: string;
  created_at: string;
  updated_at: string;
  username?: string;
  attachment_count?: number;
  image_count?: number;
}

export interface BookkeepingPurpose {
  id: number;
  name: string;
  is_default: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookkeepingAttachment {
  id: number;
  record_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface TodoItem {
  id: string;
  card_id: string;
  content: string;
  completed: boolean;
  deleted: boolean;
  created_at: number;
  updated_at: number;
}

export interface TodoCard {
  id: string;
  user_id: number;
  name: string;
  starred: boolean;
  tags: string[];
  deleted: boolean;
  created_at: number;
  updated_at: number;
  items?: TodoItem[];
}

export interface ApiResult<T = undefined> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export const BOOKKEEPING_TYPE_LABEL: Record<BookkeepingType, string> = {
  expense: '支出',
  income: '收入',
};

export const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; description: string }> =
  [
    { value: 'light', label: '浅色', description: '始终使用亮色界面' },
    { value: 'dark', label: '深色', description: '始终使用暗色界面' },
    { value: 'system', label: '跟随系统', description: '根据系统外观自动切换' },
  ];
