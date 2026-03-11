import { ReactNode } from 'react';
import { ClipboardHistoryPanel } from '../page/clipboard-history/ClipboardHistoryPanel';
import { JsonFormatterPanel } from '../page/json-formatter/JsonFormatterPanel';
import { ScreenshotHistoryPanel } from '../page/screenshot-history/ScreenshotHistoryPanel';
import { TodoListPanel } from '../page/todo-list/TodoListPanel';
import { TranslationPanel } from '../page/translation/TranslationPanel';
import { WebReaderPanel } from '../page/web-reader/WebReaderPanel';
import { ComparisonPanel } from '../page/comparison/ComparisonPanel';
import { StockPanel } from '../page/stock/StockPanel';
import { BookkeepingPanel } from '../page/bookkeeping/BookkeepingPanel';
import { VideoToGifPanel } from '../page/video-to-gif/VideoToGifPanel';

export interface RouteConfig {
  path: string;
  element: ReactNode;
  label: string;
  icon: ReactNode;
  permissionKey?: string; // 权限key，现在都设为空，方便后续扩展
  requiresAuth?: boolean; // 是否需要认证（用于过滤显示）
  isShowForGuest?: boolean; // 是否对路人身份登录的用户展示，默认为 true
}

export const routes: RouteConfig[] = [
  {
    path: '/clipboard',
    element: <ClipboardHistoryPanel />,
    label: '剪贴板历史',
    icon: '📋',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/json',
    element: <JsonFormatterPanel />,
    label: 'JSON 工具',
    icon: '🧩',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/screenshot-history',
    element: <ScreenshotHistoryPanel />,
    label: '截图历史',
    icon: '📷',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/todo-list',
    element: <TodoListPanel />,
    label: '待办事项',
    icon: '✓',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/translation',
    element: <TranslationPanel />,
    label: '翻译',
    icon: '🤖',
    permissionKey: '',
    requiresAuth: true,
    isShowForGuest: false,
  },
  {
    path: '/web-reader',
    element: <WebReaderPanel />,
    label: '网页阅读器',
    icon: '📄',
    permissionKey: '',
    requiresAuth: true,
    isShowForGuest: false,
  },
  {
    path: '/comparison',
    element: <ComparisonPanel />,
    label: '对比',
    icon: '🔍',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/stock',
    element: <StockPanel />,
    label: '股票',
    icon: '📈',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/bookkeeping',
    element: <BookkeepingPanel />,
    label: '记账',
    icon: '💰',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/video-to-gif',
    element: <VideoToGifPanel />,
    label: '视频转GIF',
    icon: '🎬',
    permissionKey: '',
    isShowForGuest: true,
  },
];

// 默认路由
export const defaultRoute = '/bookkeeping';

