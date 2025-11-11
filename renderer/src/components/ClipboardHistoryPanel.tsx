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
            className="max-h-40 overflow-auto rounded-xl border border-slate-200 hover:bg-slate-100 p-4 shadow-sm"
          >
            {item.type === "text" ? (
              <>
                <p className="whitespace-pre-wrap text-sm text-slate-800">
                  {item.content}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <time>{new Date(item.createdAt).toLocaleString()}</time>
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
