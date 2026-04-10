import { useMemo, useState, useCallback } from 'react';
import { ingestKnowledgeFile, ingestKnowledgeText, uploadChatFile } from '../../api/chatApi';
import { showToast } from '../../components/toast/Toast';

interface PendingFile {
  id: string;
  file: File;
}

export function ChatKnowledgeUploadPage() {
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [savingText, setSavingText] = useState(false);
  const [savingFiles, setSavingFiles] = useState(false);

  const totalSize = useMemo(
    () => files.reduce((sum, item) => sum + item.file.size, 0),
    [files]
  );

  const appendFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    const picked = incoming.map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 7)}`,
      file,
    }));
    setFiles((prev) => [...prev, ...picked]);
  }, []);

  const handlePasteImage = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedFiles: File[] = [];
    for (const item of Array.from(e.clipboardData.items || [])) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (file && file.type.startsWith('image/')) {
        pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      appendFiles(pastedFiles);
      showToast(`已粘贴 ${pastedFiles.length} 张图片`);
    }
  }, [appendFiles]);

  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadText = async () => {
    const text = textContent.trim();
    if (!text) {
      showToast('请输入要入库的文本');
      return;
    }
    setSavingText(true);
    try {
      await ingestKnowledgeText({ text, title: textTitle.trim() || undefined, room_id: 'public' });
      setTextContent('');
      setTextTitle('');
      showToast('文本入库成功');
    } catch {
      showToast('文本入库失败');
    } finally {
      setSavingText(false);
    }
  };

  const handleUploadFiles = async () => {
    if (files.length === 0) {
      showToast('请先选择文件');
      return;
    }
    setSavingFiles(true);
    try {
      for (const item of files) {
        const uploaded = await uploadChatFile(item.file);
        if (!uploaded) continue;
        await ingestKnowledgeFile({
          url: uploaded.url,
          name: uploaded.name,
          mime_type: uploaded.mime_type,
          size: uploaded.size,
          room_id: 'public',
        });
      }
      setFiles([]);
      showToast('文件入库成功');
    } catch {
      showToast('文件入库失败');
    } finally {
      setSavingFiles(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-800">知识库上传中心</h2>
        <p className="mt-1 text-sm text-slate-500">支持文本、图片、文件上传入库，供聊天智能体检索召回。</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">文本入库</h3>
          <input
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="标题（可选）"
            className="mt-3 h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none"
          />
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="输入要写入知识库的文本内容"
            rows={14}
            className="mt-3 flex-1 resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={handleUploadText}
            disabled={savingText}
            className="mt-3 h-10 rounded-lg bg-indigo-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingText ? '入库中...' : '保存文本到知识库'}
          </button>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700">文件入库（图片/文档/附件）</h3>
          <div
            className="mt-3"
            tabIndex={0}
            onPaste={handlePasteImage}
          >
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 hover:bg-slate-100">
              点击选择文件、拖拽到此，或粘贴图片
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                appendFiles(Array.from(e.target.files || []));
                e.currentTarget.value = '';
              }}
            />
            </label>
          </div>

          <div className="mt-3 flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
            {files.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-400">暂未选择文件</p>
            ) : (
              files.map((item) => (
                <div
                  key={item.id}
                  className="mb-1.5 flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-xs"
                >
                  <span className="truncate pr-3 text-slate-700">{item.file.name}</span>
                  <button
                    type="button"
                    className="text-rose-500"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== item.id))}
                  >
                    移除
                  </button>
                </div>
              ))
            )}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            已选 {files.length} 个文件，总大小 {formatSize(totalSize)}。支持 Ctrl/Cmd+V 粘贴图片。
          </p>
          <button
            type="button"
            onClick={handleUploadFiles}
            disabled={savingFiles}
            className="mt-3 h-10 rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingFiles ? '入库中...' : '上传文件并写入知识库'}
          </button>
        </section>
      </div>
    </div>
  );
}
