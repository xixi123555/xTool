import { ClipboardHistoryPanel } from './page/clipboard-history/ClipboardHistoryPanel';
import { JsonFormatterPanel } from './page/json-formatter/JsonFormatterPanel';
import { Sidebar } from './components/sidebar/Sidebar';
import { ScreenshotHistoryPanel } from './page/screenshot-history/ScreenshotHistoryPanel';
import { TodoListPanel } from './page/todo-list/TodoListPanel';
import { TranslationPanel } from './page/translation/TranslationPanel';
import { useState } from 'react';

import { useEffect } from 'react';
import { ScreenshotSelector } from './components/screenshot/ScreenshotSelector';
import { ScreenshotEditor } from './components/screenshot/ScreenshotEditor';
import { DraggableScreenshot } from './components/screenshot/DraggableScreenshot';
import { useIpcEvent } from './hooks/useIpcEvent';
const { showToast } = await import('./components/toast/Toast');


const panels = {
  clipboard: <ClipboardHistoryPanel />,
  json: <JsonFormatterPanel />,
  screenshotHistory: <ScreenshotHistoryPanel />,
  todoList: <TodoListPanel />,
  translation: <TranslationPanel />,
};

export function App() {
  // 检查是否是截图模式（通过 URL 参数）
  const isScreenshotMode = new URLSearchParams(window.location.search).get('screenshot') === 'true';
  const isEditorMode = new URLSearchParams(window.location.search).get('editor') === 'true';
  
  const [activePanel, setActivePanel] = useState<keyof typeof panels>('clipboard');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [draggables, setDraggables] = useState<Array<{ id: string; src: string }>>([]);
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

  useIpcEvent('screenshot:trigger', () => setSelectorOpen(true));

  useIpcEvent<{ id: string; dataUrl: string }>('screenshot:show-draggable', (item) => {
    if (item?.dataUrl) {
      setDraggables((s) => [{ id: item.id, src: item.dataUrl }, ...s]);
      (async () => {
        const { showToast } = await import('./components/toast/Toast');
        showToast('截图已保存');
      })();
    }
  });

  // 监听编辑图片事件
  useIpcEvent<string>('screenshot:edit-image', (imageDataUrl) => {
    if (imageDataUrl) {
      setEditingImage(imageDataUrl);
    }
  });

  useEffect(() => {
    // placeholder
  }, []);

  async function handleRegionConfirm(region: { x: number; y: number; width: number; height: number }) {
    setSelectorOpen(false);
    const item = (await window.api.invoke('screenshot:capture', region)) as { id: string; dataUrl: string };
    if (item?.dataUrl) {
      setDraggables((s) => [{ id: item.id, src: item.dataUrl }, ...s]);
      // refresh screenshot history panel by navigating or other means
      // show toast
      (await import('./components/toast/Toast')).showToast('截图已保存');
    }
  }

  // 编辑器模式
  if (isEditorMode && editingImage) {
    return (
      <ScreenshotEditor
        imageSrc={editingImage}
        onBack={async () => {
          await window.api.invoke('screenshot:editor-close');
        }}
        onConfirm={async (editedImage) => {
          await window.api.invoke('screenshot:confirm', editedImage);
          (async () => {
            showToast('截图已保存');
          })();
        }}
        onPin={async (imageDataUrl) => {
          await window.api.invoke('screenshot:pin', imageDataUrl);
          await window.api.invoke('screenshot:confirm', imageDataUrl);
          (async () => {
            showToast('截图已固定');
          })();
        }}
      />
    );
  }

  // 截图模式下只显示选择器，背景透明
  if (isScreenshotMode) {
    return (
      <div className="h-screen w-screen bg-transparent">
        <ScreenshotSelector
          open={true}
          onCancel={async () => {
            // 通知主进程恢复窗口状态
            await window.api.invoke('screenshot:cancel');
          }}
          onConfirm={handleRegionConfirm}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-800">
      <Sidebar activePanel={activePanel} onChange={setActivePanel} />
      <main className="flex flex-1 flex-col gap-4 p-6 overflow-hidden">
        {panels[activePanel]}
      </main>

      <ScreenshotSelector
        open={selectorOpen}
        onCancel={async () => {
          setSelectorOpen(false);
          // 通知主进程恢复窗口状态
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
