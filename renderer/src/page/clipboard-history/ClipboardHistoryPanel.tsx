import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "../../store/useAppStore";
import { ClipboardItem } from "devtools-suite-shared";
import { useIpcEvent } from "../../hooks/useIpcEvent";
import { ImagePreviewOverlay } from "../../components/image-preview/ImagePreviewOverlay";
import { showToast } from "../../components/toast/Toast";

export function ClipboardHistoryPanel() {
  const clipboardHistory = useAppStore((state) => state.clipboardHistory);
  const setClipboardHistory = useAppStore((state) => state.setClipboardHistory);
  const addClipboardItem = useAppStore((state) => state.addClipboardItem);

  useEffect(() => {
    async function fetchHistory() {
      if (!window.api || typeof window.api.invoke !== "function") {
        console.error("[renderer] window.api.invoke unavailable");
        return;
      }
      const response = (await window.api.invoke(
        "clipboard:get-history"
      )) as ClipboardItem[];
      setClipboardHistory(response);
    }

    fetchHistory();
  }, [setClipboardHistory]);

  useIpcEvent("clipboard:new-item", addClipboardItem);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string>("");

  const handleItemClick = (item: ClipboardItem) => async (e: React.MouseEvent<HTMLLIElement>) => {
    e.stopPropagation();
    if (item.type === 'text') {
      await window.api.invoke('clipboard:write', { type: 'text', content: item.content });
      showToast('已复制到剪贴板');
      return;
    }
    setPreviewSrc(item.content);
    setPreviewOpen(true);
  };

  const handlePreviewConfirm = useCallback(async () => {
    if (!previewSrc) return;
    await window.api.invoke('clipboard:write', { type: 'image', content: previewSrc });
    showToast('已复制到剪贴板');
    setPreviewOpen(false);
    setPreviewSrc("");
  }, [previewSrc]);

  const handlePreviewCancel = useCallback(() => {
    setPreviewOpen(false);
    setPreviewSrc("");
  }, []);


  return (
    <section className="flex flex-col h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-soft backdrop-blur">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">剪贴板历史</h2>
          <p className="text-sm text-slate-500">点击保存复制</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary"
            onClick={() => window.api.invoke("clipboard:clear")}
          >
            清空
          </button>
        </div>
      </header>
      <ul className="space-y-3 flex-1 !overflow-auto">
        {clipboardHistory.map((item) => (
          <li
            key={item.id}
            className="group max-h-40 overflow-auto rounded-xl border border-slate-200 hover:bg-slate-100 p-4 shadow-sm cursor-pointer"
            onClick={handleItemClick(item)}
          >
            {item.type === "text" ? (
              <>
                <p className="whitespace-pre-wrap text-sm text-slate-800">
                  {item.content}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <time>{new Date(item.createdAt).toLocaleString()}</time>
                  <span className="hidden group-hover:inline text-xs text-slate-500">点击复制</span>
                </div>
              </>
            ) : (
              <img src={item.content} alt="" className="h-25 rounded-xl" />
            )}
          </li>
        ))}
        {clipboardHistory.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            复制一些文本，这里会自动显示最近的剪贴板记录。
          </li>
        )}
      </ul>
      <ImagePreviewOverlay
        open={previewOpen}
        src={previewSrc}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
      />
    </section>
  );
}
