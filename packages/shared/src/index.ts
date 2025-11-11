export type ClipboardItem = {
  id: string;
  content: string;
  createdAt: number;
  type?: 'text' | 'image';
};

export type ThemeMode = 'light' | 'dark' | 'system';
