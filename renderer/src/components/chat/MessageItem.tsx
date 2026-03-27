/**
 * 单条聊天消息组件 — 左右分布
 */
import type { ChatMessage } from '../../api/chatApi';

interface MessageItemProps {
  message: ChatMessage;
  isMine: boolean;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getAvatarText(username?: string): string {
  return (username || '?')[0].toUpperCase();
}

function formatFileSize(size?: number): string {
  if (!size || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageItem({ message, isMine }: MessageItemProps) {
  const textParts = message.content_json
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('');
  const imageParts = message.content_json.filter((p) => p.type === 'image' && p.image_url);
  const fileParts = message.content_json.filter((p) => p.type === 'file' && p.file_url);
  const hasContent = Boolean(textParts || imageParts.length > 0 || fileParts.length > 0);

  const avatar = message.avatar ? (
    <img
      src={message.avatar}
      alt={message.username}
      className="h-9 w-9 flex-shrink-0 rounded-full border border-white/80 object-cover shadow-sm"
    />
  ) : (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-semibold text-white shadow-sm">
      {getAvatarText(message.username)}
    </div>
  );

  return (
    <div className={`flex gap-2.5 px-1 py-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {avatar}
      <div className={`flex max-w-[78%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-500">{message.username}</span>
          {message.room_id && message.room_id !== 'public' && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {message.room_id}
            </span>
          )}
          <span className="text-xs text-slate-300">{formatTime(message.created_at)}</span>
        </div>
        <div
          className={`space-y-2 rounded-2xl px-3.5 py-2.5 text-[15px] leading-6 break-words whitespace-pre-wrap shadow-sm ${
            isMine
              ? 'rounded-tr-md bg-gradient-to-br from-indigo-500 via-blue-500 to-violet-500 text-white shadow-[0_10px_20px_rgba(79,70,229,0.28)]'
              : 'rounded-tl-md border border-slate-200/80 bg-white text-slate-700'
          }`}
        >
          {textParts && <p>{textParts}</p>}
          {imageParts.map((part, idx) => (
            <a
              key={`${message.id}-img-${idx}`}
              href={part.image_url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <img
                src={part.image_url}
                alt="聊天图片"
                className="max-h-56 max-w-full rounded-xl border border-black/5 object-cover"
              />
            </a>
          ))}
          {fileParts.map((part, idx) => (
            <a
              key={`${message.id}-file-${idx}`}
              href={part.file_url}
              download={part.file_name || '附件'}
              target="_blank"
              rel="noreferrer"
              className={`block rounded-md border px-3 py-2 ${
                isMine
                  ? 'border-white/35 bg-white/12 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <p className="text-xs font-semibold break-all">{part.file_name || '附件'}</p>
              <p className={`text-[11px] ${isMine ? 'text-blue-100/90' : 'text-slate-400'}`}>
                {part.mime_type || 'application/octet-stream'}
                {part.file_size ? ` · ${formatFileSize(part.file_size)}` : ''}
              </p>
            </a>
          ))}
          {!hasContent && '[空消息]'}
        </div>
      </div>
    </div>
  );
}
