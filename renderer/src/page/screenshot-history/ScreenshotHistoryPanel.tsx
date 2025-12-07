import { useEffect, useState, useCallback } from 'react';
import { useIpcEvent } from '../../hooks/useIpcEvent';
import { ImagePreviewOverlay } from '../../components/image-preview/ImagePreviewOverlay';
import { showToast } from '../../components/toast/Toast';
import { CopyIcon } from '../../assets/icons';

type ScreenshotItem = { id: string; hash: string; dataUrl: string; createdAt: number };

export function ScreenshotHistoryPanel() {
  const [items, setItems] = useState<ScreenshotItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>('');

  useEffect(() => {
    (async () => {
      const list = (await window.api.invoke('screenshot:get-history')) as ScreenshotItem[];
      setItems(list || []);
    })();
  }, []);

  useIpcEvent<ScreenshotItem>('screenshot:new-item', (item) => {
    setItems((prev) => [item, ...prev].slice(0, 12));
    setTimeout(() => {
      console.log('screenshot:new-item', items.map(({ hash }) => hash));
    }, 1000)
  });

  const handleImageClick = (item: ScreenshotItem) => {
    setPreviewSrc(item.dataUrl);
    setPreviewOpen(true);
  };

  const handleCopyImage = async (e: React.MouseEvent, item: ScreenshotItem) => {
    e.stopPropagation();
    try {
      await window.api.invoke('clipboard:write', { type: 'image', content: item.dataUrl });
      showToast('已复制到剪贴板');
    } catch (error) {
      showToast('复制失败');
    }
  };

  const handlePreviewConfirm = useCallback(async () => {
    if (!previewSrc) return;
    await window.api.invoke('clipboard:write', { type: 'image', content: previewSrc });
    showToast('已复制到剪贴板');
    setPreviewOpen(false);
    setPreviewSrc('');
  }, [previewSrc]);

  const handlePreviewCancel = useCallback(() => {
    setPreviewOpen(false);
    setPreviewSrc('');
  }, []);

  return (
    <>
      <section className="flex flex-col h-full">
        <h3 className="text-sm font-semibold mb-3 flex-shrink-0">截图历史（最多12张）</h3>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid grid-cols-3 gap-4 pb-4">
            {items.slice(0, 12).map((it) => (
              <div key={it.id} className="rounded-md overflow-hidden border bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                <img 
                  src={it.dataUrl} 
                  alt="history" 
                  className="w-full h-40 object-cover"
                  onClick={() => handleImageClick(it)}
                />
                <div className="p-2 text-xs text-slate-500 flex items-center justify-between">
                  <span>{new Date(it.createdAt).toLocaleString()}</span>
                  <button
                    onClick={(e) => handleCopyImage(e, it)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                    title="复制到剪贴板"
                  >
                    <CopyIcon className="text-slate-600" />
                  </button>
                </div>
          </div>
        ))}
          </div>
      </div>
    </section>
      <ImagePreviewOverlay
        open={previewOpen}
        src={previewSrc}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
        hintText="点击空白区域复制到剪贴板"
      />
    </>
  );
}
