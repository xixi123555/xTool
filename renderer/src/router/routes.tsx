import { ReactNode, lazy } from 'react';

const ClipboardHistoryPanel = lazy(() =>
  import('../page/clipboard-history/ClipboardHistoryPanel').then(m => ({ default: m.ClipboardHistoryPanel }))
);
const JsonFormatterPanel = lazy(() =>
  import('../page/json-formatter/JsonFormatterPanel').then(m => ({ default: m.JsonFormatterPanel }))
);
const ScreenshotHistoryPanel = lazy(() =>
  import('../page/screenshot-history/ScreenshotHistoryPanel').then(m => ({ default: m.ScreenshotHistoryPanel }))
);
const TodoListPanel = lazy(() =>
  import('../page/todo-list/TodoListPanel').then(m => ({ default: m.TodoListPanel }))
);
const TranslationPanel = lazy(() =>
  import('../page/translation/TranslationPanel').then(m => ({ default: m.TranslationPanel }))
);
const WebReaderPanel = lazy(() =>
  import('../page/web-reader/WebReaderPanel').then(m => ({ default: m.WebReaderPanel }))
);
const ComparisonPanel = lazy(() =>
  import('../page/comparison/ComparisonPanel').then(m => ({ default: m.ComparisonPanel }))
);
const StockPanel = lazy(() =>
  import('../page/stock/StockPanel').then(m => ({ default: m.StockPanel }))
);
const BookkeepingPanel = lazy(() =>
  import('../page/bookkeeping/BookkeepingPanel').then(m => ({ default: m.BookkeepingPanel }))
);
const VideoToGifPanel = lazy(() =>
  import('../page/video-to-gif/VideoToGifPanel').then(m => ({ default: m.VideoToGifPanel }))
);
const ChatRoomPanel = lazy(() =>
  import('../page/chat-room/ChatRoomPanel').then(m => ({ default: m.ChatRoomPanel }))
);
const AgentOrchestratorPage = lazy(() =>
  import('../page/agent-orchestrator/AgentOrchestratorPage').then(m => ({ default: m.AgentOrchestratorPage }))
);
const ChatKnowledgeUploadPage = lazy(() =>
  import('../page/chat-kb-upload/ChatKnowledgeUploadPage').then(m => ({ default: m.ChatKnowledgeUploadPage }))
);
const CodeAssistantPage = lazy(() =>
  import('../page/code-assistant/CodeAssistantPage').then(m => ({ default: m.CodeAssistantPage }))
);

export interface RouteConfig {
  path: string;
  element: ReactNode;
  label: string;
  icon: ReactNode;
  permissionKey?: string;
  requiresAuth?: boolean;
  isShowForGuest?: boolean;
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
    requiresAuth: true,
    isShowForGuest: false,
  },
  {
    path: '/video-to-gif',
    element: <VideoToGifPanel />,
    label: '视频转GIF',
    icon: '🎬',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/chat/room',
    element: <ChatRoomPanel />,
    label: '聊天室',
    icon: '💬',
    permissionKey: '',
    isShowForGuest: true,
  },
  {
    path: '/chat/orchestrator',
    element: <AgentOrchestratorPage />,
    label: '智能体编排',
    icon: '🧠',
    permissionKey: '',
    requiresAuth: true,
    isShowForGuest: false,
  },
  {
    path: '/chat/kb-upload',
    element: <ChatKnowledgeUploadPage />,
    label: '知识库上传',
    icon: '📚',
    permissionKey: '',
    requiresAuth: true,
    isShowForGuest: false,
  },
  {
    path: '/code',
    element: <CodeAssistantPage />,
    label: 'Code',
    icon: '💻',
    permissionKey: '',
    isShowForGuest: true,
  },
];

// 默认路由
export const defaultRoute = '/chat/room';
