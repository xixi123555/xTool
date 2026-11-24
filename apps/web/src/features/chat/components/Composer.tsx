import { Paperclip, SendHorizontal, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { formatFileSize } from '../../../shared/lib/format';
import { toast } from '../../../shared/store/feedback';

interface ComposerProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (payload: { text?: string; files?: File[] }) => Promise<void> | void;
}

export function Composer({ disabled, placeholder, onSend }: ComposerProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (disabled || sending) return;
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      await onSend({ text: text.trim() || undefined, files: files.length > 0 ? files : undefined });
      setText('');
      setFiles([]);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch {
      toast('发送失败，请重试', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="safe-bottom border-t border-line bg-surface p-2.5 md:p-3">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-fg"
            >
              <Paperclip className="h-3 w-3 text-subtle" />
              <span className="max-w-40 truncate">{file.name}</span>
              <span className="text-[10px] text-subtle">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() =>
                  setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                className="text-subtle hover:text-danger"
                aria-label="移除"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 rounded-2xl border border-line bg-canvas p-1.5">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []);
            if (picked.length > 0) setFiles((current) => [...current, ...picked]);
            event.target.value = '';
          }}
        />
        <button
          type="button"
          className="btn-ghost h-9 w-9 flex-shrink-0 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="添加附件"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-6 text-fg outline-none placeholder:text-subtle"
          placeholder={placeholder ?? '输入消息，Enter 发送，Shift+Enter 换行'}
          value={text}
          disabled={disabled}
          onChange={(event) => {
            setText(event.target.value);
            const element = event.target;
            element.style.height = 'auto';
            element.style.height = `${Math.min(element.scrollHeight, 128)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />

        <button
          type="button"
          className="btn-primary h-9 w-9 flex-shrink-0 p-0"
          onClick={() => void handleSend()}
          disabled={disabled || sending || (!text.trim() && files.length === 0)}
          aria-label="发送"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 px-1 text-[11px] text-subtle">/bot 问题：呼叫机器人回答并引用知识库</p>
    </div>
  );
}
