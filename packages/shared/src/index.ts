export type ClipboardItem = {
  id: string;
  content: string;
  createdAt: number;
  type?: 'text' | 'image';
};

export type ScreenshotItem = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

export type ThemeMode = 'light' | 'dark' | 'system';
