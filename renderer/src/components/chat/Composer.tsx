/**
 * 聊天输入框组件 — 支持 Enter 发送、粘贴图片、拖拽附件
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { showToast } from '../toast/Toast';

interface ComposerProps {
  onSend: (payload: { text?: string; files?: File[] }) => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
}

interface PendingAttachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  mimeType: string;
  size: number;
  file: File;
  previewUrl?: string;
}

const MAX_FILES = 9;
const MAX_SINGLE_FILE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE = 20 * 1024 * 1024;

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function Composer({ onSend, disabled, placeholder = '输入消息...' }: ComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [readingFiles, setReadingFiles] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<PendingAttachment[]>([]);

  const revokePreviewUrls = useCallback((items: PendingAttachment[]) => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(attachmentsRef.current);
    };
  }, [revokePreviewUrls]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled || readingFiles) return;
    Promise.resolve(onSend({ text: trimmed || undefined, files: attachments.map((a) => a.file) }))
      .then(() => {
        revokePreviewUrls(attachments);
        setText('');
        setAttachments([]);
        inputRef.current?.focus();
      })
      .catch(() => {
        showToast('发送失败');
      });
  }, [text, attachments, disabled, readingFiles, onSend, revokePreviewUrls]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      if (attachments.length >= MAX_FILES) {
        showToast(`最多添加 ${MAX_FILES} 个附件`);
        return;
      }

      const allowedCount = MAX_FILES - attachments.length;
      const incoming = files.slice(0, allowedCount);
      const currentTotal = attachments.reduce((sum, item) => sum + item.size, 0);
      let totalSize = currentTotal;

      const validFiles: File[] = [];
      for (const file of incoming) {
        if (file.size > MAX_SINGLE_FILE_SIZE) {
          showToast(`文件过大：${file.name}（上限 ${formatFileSize(MAX_SINGLE_FILE_SIZE)}）`);
          continue;
        }
        if (totalSize + file.size > MAX_TOTAL_FILE_SIZE) {
          showToast(`附件总大小不能超过 ${formatFileSize(MAX_TOTAL_FILE_SIZE)}`);
          break;
        }
        totalSize += file.size;
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;
      setReadingFiles(true);
      try {
        const loaded = validFiles.map((file) => {
          const attachmentType: PendingAttachment['type'] = file.type.startsWith('image/')
            ? 'image'
            : 'file';
          return {
            id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
            type: attachmentType,
            name: file.name || '未命名附件',
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            file,
            previewUrl: attachmentType === 'image' ? URL.createObjectURL(file) : undefined,
          };
        });
        setAttachments((prev) => [...prev, ...loaded]);
      } catch {
        showToast('读取附件失败');
      } finally {
        setReadingFiles(false);
      }
    },
    [attachments]
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void addFiles(files);
      }
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) {
        void addFiles(files);
      }
    },
    [addFiles]
  );

  const canSend = !disabled && !readingFiles && (Boolean(text.trim()) || attachments.length > 0);

  const toolBtnClass =
    'flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div
      className={`chat-composer border-t px-4 pb-4 pt-3 transition-colors ${
        dragging ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200/80 bg-white/80'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <div className="mb-2.5 flex items-center gap-1.5 border-b border-slate-200/80 pb-2.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) void addFiles(files);
            e.currentTarget.value = '';
          }}
        />
        <button type="button" className={toolBtnClass} disabled title="表情（预留）">
          <span className="text-base">☺</span>
        </button>
        <button
          type="button"
          className={toolBtnClass}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="添加图片/附件"
        >
          <span className="text-lg leading-none">＋</span>
        </button>
        <button type="button" className={toolBtnClass} disabled title="截图（预留）">
          <span className="text-base">✂</span>
        </button>
        <button type="button" className={toolBtnClass} disabled title="语音（预留）">
          <span className="text-base">●</span>
        </button>
        <span className="ml-auto text-xs font-medium text-slate-400">
          支持粘贴图片、拖拽文件
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start gap-2.5">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-slate-200 bg-slate-50 p-1"
            >
              <button
                type="button"
                className="absolute -right-2 -top-2 hidden h-5 w-5 rounded-full bg-black/70 text-xs text-white group-hover:block"
                onClick={() => removeAttachment(item.id)}
                aria-label="移除附件"
              >
                ×
              </button>
              {item.type === 'image' ? (
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-44 px-2 py-1">
                  <p className="truncate text-xs font-medium text-slate-700" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{formatFileSize(item.size)}</p>
                </div>
              )}
            </div>
          ))}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className="min-h-[96px] min-w-[220px] flex-1 resize-none border-0 bg-transparent px-1 py-0 text-[16px] leading-7 text-slate-700 outline-none placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-end border-t border-slate-100 pt-2">
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="h-9 min-w-[88px] rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.28)] transition-all hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
