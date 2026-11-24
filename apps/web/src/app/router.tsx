import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '../shared/layout/AppLayout';
import { PageLoading } from '../shared/ui/Page';
import { RequireAuth, RequireMember, PublicOnly } from './guards';

const LoginPage = lazy(() =>
  import('../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const BookkeepingPage = lazy(() =>
  import('../features/bookkeeping/BookkeepingPage').then((module) => ({
    default: module.BookkeepingPage,
  })),
);
const TodoPage = lazy(() =>
  import('../features/todo/TodoPage').then((module) => ({ default: module.TodoPage })),
);
const ToolsPage = lazy(() =>
  import('../features/tools/ToolsPage').then((module) => ({ default: module.ToolsPage })),
);
const JsonPage = lazy(() =>
  import('../features/tools/json/JsonPage').then((module) => ({ default: module.JsonPage })),
);
const DiffPage = lazy(() =>
  import('../features/tools/diff/DiffPage').then((module) => ({ default: module.DiffPage })),
);
const TranslatePage = lazy(() =>
  import('../features/tools/translate/TranslatePage').then((module) => ({
    default: module.TranslatePage,
  })),
);
const ReaderPage = lazy(() =>
  import('../features/tools/reader/ReaderPage').then((module) => ({ default: module.ReaderPage })),
);
const VideoPage = lazy(() =>
  import('../features/tools/video/VideoPage').then((module) => ({ default: module.VideoPage })),
);
const StockPage = lazy(() =>
  import('../features/tools/stock/StockPage').then((module) => ({ default: module.StockPage })),
);
const ChatPage = lazy(() =>
  import('../features/chat/ChatPage').then((module) => ({ default: module.ChatPage })),
);
const KnowledgePage = lazy(() =>
  import('../features/chat/KnowledgePage').then((module) => ({ default: module.KnowledgePage })),
);
const OrchestratorPage = lazy(() =>
  import('../features/chat/OrchestratorPage').then((module) => ({
    default: module.OrchestratorPage,
  })),
);
const CodePage = lazy(() =>
  import('../features/chat/CodePage').then((module) => ({ default: module.CodePage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/bookkeeping" replace />} />
            <Route path="/bookkeeping" element={<BookkeepingPage />} />
            <Route path="/todo" element={<TodoPage />} />

            <Route path="/ai/chat" element={<ChatPage />} />
            <Route path="/ai/code" element={<CodePage />} />

            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/tools/json" element={<JsonPage />} />
            <Route path="/tools/diff" element={<DiffPage />} />
            <Route path="/tools/video" element={<VideoPage />} />
            <Route path="/tools/stock" element={<StockPage />} />

            <Route element={<RequireMember />}>
              <Route path="/ai/knowledge" element={<KnowledgePage />} />
              <Route path="/ai/orchestrator" element={<OrchestratorPage />} />
              <Route path="/tools/translate" element={<TranslatePage />} />
              <Route path="/tools/reader" element={<ReaderPage />} />
            </Route>

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/bookkeeping" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
