import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { LoginPage } from './page/login/LoginPage';
import { SettingsDrawer } from './components/settings/SettingsDrawer';
import { SettingsPanel } from './page/settings/SettingsPanel';
import { ScreenshotSelector } from './components/screenshot/ScreenshotSelector';
import { ScreenshotEditor } from './components/screenshot/ScreenshotEditor';
import { DraggableScreenshot } from './components/screenshot/DraggableScreenshot';
import { AppRouter } from './router';
import { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { useIpcEvent } from './hooks/useIpcEvent';
import { showToast } from './components/toast/Toast';

// 主应用内容组件（需要登录）
function MainApp() {
  const navigate = useNavigate();
  const { user, token, setUser, setToken, shortcuts, setShortcuts, setAppConfig, appConfig } = useAppStore();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [draggables, setDraggables] = useState<Array<{ id: string; src: string }>>([]);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 应用主题到根元素
  useEffect(() => {
    const theme = appConfig.theme || 'light';
    
    // 移除所有主题类
    document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
    
    // 添加新主题类（light 主题时不需要添加，使用默认变量）
    if (theme !== 'light') {
      document.documentElement.classList.add(`theme-${theme}`);
      document.body.classList.add(`theme-${theme}`);
    }
  }, [appConfig.theme]);

  // 初始化时从 localStorage 恢复用户信息和快捷键配置
  useEffect(() => {
    const savedToken = localStorage.getItem('xtool_token');
    const savedUser = localStorage.getItem('xtool_user');
    const savedShortcuts = localStorage.getItem('xtool_shortcuts');
    const savedAppConfig = localStorage.getItem('xtool_appConfig');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      if (savedShortcuts) {
        const parsedShortcuts = JSON.parse(savedShortcuts);
        setShortcuts(parsedShortcuts);
        // 应用快捷键配置（包括默认快捷键）
        // 延迟调用，确保 IPC 处理器已经注册
        setTimeout(() => {
          window.api.invoke('shortcut:apply-user-shortcuts', parsedShortcuts || {}).catch((error) => {
            console.error('Failed to apply user shortcuts:', error);
            // 如果失败，稍后重试
            setTimeout(() => {
              window.api.invoke('shortcut:apply-user-shortcuts', parsedShortcuts || {}).catch((err) => {
                console.error('Retry failed to apply user shortcuts:', err);
              });
            }, 1000);
          });
        }, 500);
      }
      if (savedAppConfig) {
        const parsedAppConfig = JSON.parse(savedAppConfig);
        const configWithTheme = { ...parsedAppConfig, theme: parsedAppConfig.theme || 'light' };
        setAppConfig(configWithTheme);
        // 立即应用主题（不依赖 useEffect，因为此时 appConfig 可能还未更新）
        const theme = configWithTheme.theme || 'light';
        document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
        if (theme !== 'light') {
          document.documentElement.classList.add(`theme-${theme}`);
          document.body.classList.add(`theme-${theme}`);
        }
      } else {
        // 使用默认配置
        setAppConfig({ use_local_data: true, theme: 'light' });
        // 确保默认主题应用（移除所有主题类，使用 :root 的默认变量）
        document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-colorful');
      }
    }
  }, [setToken, setUser, setShortcuts, setAppConfig]);

  useIpcEvent('screenshot:trigger', () => setSelectorOpen(true));

  // 监听切换设置的快捷键（打开/关闭）
  useIpcEvent('shortcut:toggle-settings', () => {
    setSettingsOpen((prev) => !prev);
  });

  // 监听显示剪贴板历史的快捷键
  useIpcEvent('shortcut:show-clipboard', () => {
    // 导航到剪贴板历史页面
    navigate('/clipboard');
  });

  useIpcEvent<{ id: string; dataUrl: string }>('screenshot:show-draggable', (item) => {
    if (item?.dataUrl) {
      setDraggables((s) => [{ id: item.id, src: item.dataUrl }, ...s]);
      showToast('截图已保存');
    }
  });

  // 监听编辑图片事件
  useIpcEvent<string>('screenshot:edit-image', (imageDataUrl) => {
    if (imageDataUrl) {
      setEditingImage(imageDataUrl);
    }
  });

  async function handleRegionConfirm(region: { x: number; y: number; width: number; height: number }) {
    setSelectorOpen(false);
    const item = (await window.api.invoke('screenshot:capture', region)) as { id: string; dataUrl: string };
    if (item?.dataUrl) {
      setDraggables((s) => [{ id: item.id, src: item.dataUrl }, ...s]);
      showToast('截图已保存');
    }
  }

  // 如果未登录，重定向到登录页
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-800">
      <Sidebar onSettingsClick={() => setSettingsOpen(true)} />
      <main className="flex flex-1 flex-col gap-4 p-6 overflow-hidden">
        <AppRouter />
      </main>

      {/* 设置抽屉 */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      >
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      </SettingsDrawer>

      <ScreenshotSelector
        open={selectorOpen}
        onCancel={async () => {
          setSelectorOpen(false);
          await window.api.invoke('screenshot:cancel');
        }}
        onConfirm={handleRegionConfirm}
      />

      {draggables.map((d) => (
        <DraggableScreenshot key={d.id} src={d.src} onRemove={() => setDraggables((s) => s.filter((x) => x.id !== d.id))} />
      ))}
    </div>
  );
}

export function App() {
  // 检查是否是截图模式（通过 URL 参数）
  const isScreenshotMode = new URLSearchParams(window.location.search).get('screenshot') === 'true';
  const isEditorMode = new URLSearchParams(window.location.search).get('editor') === 'true';
  const [editingImage, setEditingImage] = useState<string | null>(null);

  // 在截图模式下设置 body 和 html 的背景透明
  useEffect(() => {
    if (isScreenshotMode) {
      document.body.classList.add('screenshot-mode');
      document.documentElement.classList.add('screenshot-mode');
      return () => {
        document.body.classList.remove('screenshot-mode');
        document.documentElement.classList.remove('screenshot-mode');
      };
    }
  }, [isScreenshotMode]);

  useIpcEvent<string>('screenshot:edit-image', (imageDataUrl) => {
    if (imageDataUrl) {
      setEditingImage(imageDataUrl);
    }
  });

  // 截图模式下只显示选择器，背景透明（不需要登录）
  if (isScreenshotMode) {
    return (
      <div className="h-screen w-screen bg-transparent">
        <ScreenshotSelector
          open={true}
          onCancel={async () => {
            await window.api.invoke('screenshot:cancel');
          }}
          onConfirm={async (region: { x: number; y: number; width: number; height: number }) => {
            const item = (await window.api.invoke('screenshot:capture', region)) as { id: string; dataUrl: string };
            if (item?.dataUrl) {
              showToast('截图已保存');
            }
          }}
        />
      </div>
    );
  }

  // 编辑器模式（不需要登录）
  if (isEditorMode) {
    // 如果还没有收到图片数据，等待一下
    if (!editingImage) {
      // 等待图片数据到达
      return (
        <div className="flex h-screen items-center justify-center bg-slate-900">
          <div className="text-slate-400">加载中...</div>
        </div>
      );
    }
    return (
      <ScreenshotEditor
        imageSrc={editingImage}
        onBack={async () => {
          await window.api.invoke('screenshot:editor-close');
        }}
        onConfirm={async (editedImage) => {
          await window.api.invoke('screenshot:confirm', editedImage);
          showToast('截图已保存');
        }}
        onPin={async (imageDataUrl) => {
          await window.api.invoke('screenshot:pin', imageDataUrl);
          await window.api.invoke('screenshot:confirm', imageDataUrl);
          showToast('截图已固定');
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}
