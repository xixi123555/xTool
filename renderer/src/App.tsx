import { ClipboardHistoryPanel } from './page/clipboard-history/ClipboardHistoryPanel';
import { JsonFormatterPanel } from './page/json-formatter/JsonFormatterPanel';
import { Sidebar } from './components/sidebar/Sidebar';
import { ScreenshotHistoryPanel } from './page/screenshot-history/ScreenshotHistoryPanel';
import { useState } from 'react';

import { useEffect } from 'react';
import { ScreenshotSelector } from './components/screenshot/ScreenshotSelector';
import { DraggableScreenshot } from './components/screenshot/DraggableScreenshot';
import { useIpcEvent } from './hooks/useIpcEvent';

const panels = {
  clipboard: <ClipboardHistoryPanel />,
  json: <JsonFormatterPanel />,
  screenshotHistory: <></>,
};

export function App() {
  const [activePanel, setActivePanel] = useState<keyof typeof panels>('clipboard');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [draggables, setDraggables] = useState<Array<{ id: string; src: string }>>([]);

  useIpcEvent('screenshot:trigger', () => setSelectorOpen(true));

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

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-800">
      <Sidebar activePanel={activePanel} onChange={setActivePanel} />
      <main className="flex flex-1 flex-col gap-4 p-6">
        {activePanel === 'clipboard' && <ClipboardHistoryPanel />}
        {activePanel === 'json' && <JsonFormatterPanel />}
        {activePanel === 'screenshotHistory' && <ScreenshotHistoryPanel />}
      </main>

      <ScreenshotSelector open={selectorOpen} onCancel={() => setSelectorOpen(false)} onConfirm={handleRegionConfirm} />

      {draggables.map((d) => (
        <DraggableScreenshot key={d.id} src={d.src} onRemove={() => setDraggables((s) => s.filter((x) => x.id !== d.id))} />
      ))}
    </div>
  );
}
