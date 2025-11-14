import { useEffect, useState } from 'react';
import { useIpcEvent } from '../../hooks/useIpcEvent';

type ScreenshotItem = { id: string; dataUrl: string; createdAt: number };

export function ScreenshotHistoryPanel() {
  const [items, setItems] = useState<ScreenshotItem[]>([]);

  useEffect(() => {
    (async () => {
      const list = (await window.api.invoke('screenshot:get-history')) as ScreenshotItem[];
      setItems(list || []);
    })();
  }, []);

  useIpcEvent<ScreenshotItem>('screenshot:new-item', (item) => {
    setItems((prev) => [item, ...prev].slice(0, 10));
  });

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">截图历史（最多10张）</h3>
      <div className="grid grid-cols-5 gap-3">
        {items.slice(0, 10).map((it) => (
          <div key={it.id} className="rounded-md overflow-hidden border bg-white shadow-sm">
            <img src={it.dataUrl} alt="history" className="w-full h-20 object-cover" />
            <div className="p-2 text-xs text-slate-500">{new Date(it.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
