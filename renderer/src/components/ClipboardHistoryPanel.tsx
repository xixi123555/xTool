import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { ClipboardItem } from "devtools-suite-shared";
import { useIpcEvent } from "../hooks/useIpcEvent";

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

  useEffect(() => {
    console.log('====================================');
    console.log(clipboardHistory);
    console.log('====================================');
  }, [clipboardHistory])

  useIpcEvent("clipboard:new-item", addClipboardItem);

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
            onClick={async (e) => {
              // 点击 li：文本立即写入剪贴板；图片触发预览，不立即写入
              e.stopPropagation();
              if (item.type === 'text') {
                await window.api.invoke('clipboard:write', { type: 'text', content: item.content });
              } else {
                const overlay = document.createElement('div');
                overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center';
                const container = document.createElement('div');
                container.className = 'relative max-w-[80vw] max-h-[80vh]';
                const img = document.createElement('img');
                img.src = item.content;
                img.className = 'rounded-xl shadow-2xl object-contain max-w-full max-h-[80vh]';
                const hint = document.createElement('div');
                hint.className = 'absolute -top-10 left-0 right-0 text-center text-sm text-white/80';
                hint.textContent = '点击空白区域确认复制到剪贴板';
                container.appendChild(img);
                container.appendChild(hint);
                overlay.appendChild(container);
                document.body.appendChild(overlay);

                function cleanup() {
                  overlay.removeEventListener('click', onOverlayClick);
                  document.removeEventListener('keydown', onKeyDown);
                  overlay.remove();
                }
                async function onOverlayClick(ev: MouseEvent) {
                  // 仅当点击遮罩空白处时执行复制；点击图片本身不触发
                  if (ev.target === overlay) {
                    await window.api.invoke('clipboard:write', { type: 'image', content: item.content });
                    cleanup();
                  }
                }
                function onKeyDown(ev: KeyboardEvent) {
                  // Esc 取消
                  if (ev.key === 'Escape') {
                    cleanup();
                  }
                }
                overlay.addEventListener('click', onOverlayClick);
                document.addEventListener('keydown', onKeyDown);
              }
            }}
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
    </section>
  );
}
