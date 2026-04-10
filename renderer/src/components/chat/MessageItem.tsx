/**
 * 单条聊天消息组件 — 左右分布
 */
import type { ChatMessage } from '../../api/chatApi';

interface MessageItemProps {
  message: ChatMessage;
  isMine: boolean;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((idx) => (
        <span
          key={idx}
          className="h-1.5 w-1.5 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${idx * 0.12}s` }}
        />
      ))}
    </span>
  );
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
    .filter((p) => p.type === 'text' && (p.text || p.payload?.text))
    .map((p) => p.text || p.payload?.text || '')
    .join('');
  const imageParts = message.content_json.filter((p) => p.type === 'image' && (p.image_url || p.payload?.url));
  const fileParts = message.content_json.filter((p) => p.type === 'file' && (p.file_url || p.payload?.url));
  const linkParts = message.content_json.filter((p) => p.type === 'link' && p.payload?.url);
  const hasContent = Boolean(
    textParts
    || imageParts.length > 0
    || fileParts.length > 0
    || linkParts.length > 0
    || (message.pending && message.is_agent),
  );

  const displayName = message.is_agent ? (message.agent_name || '智能体') : message.username;
  const avatar = message.avatar ? (
    <img
      src={message.avatar}
      alt={displayName}
      className="h-9 w-9 flex-shrink-0 rounded-full border border-white/80 object-cover shadow-sm"
    />
  ) : (
    <div
      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ${
        message.is_agent
          ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
          : 'bg-gradient-to-br from-sky-500 to-indigo-500'
      }`}
    >
      {message.is_agent ? 'AI' : getAvatarText(message.username)}
    </div>
  );

  return (
    <div className={`flex gap-2.5 px-1 py-1.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {avatar}
      <div className={`flex max-w-[78%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-500">{displayName}</span>
          {message.is_agent && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
              机器人
            </span>
          )}
          {message.pending && message.is_agent && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
              回复中
            </span>
          )}
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
          {message.pending && message.is_agent ? (
            <p className="flex items-center gap-2">
              <span>思考中</span>
              <TypingDots />
            </p>
          ) : textParts ? (
            <p>{textParts}</p>
          ) : null}
          {imageParts.map((part, idx) => (
            <a
              key={`${message.id}-img-${idx}`}
              href={part.image_url || part.payload?.url}
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <img
                src={part.image_url || part.payload?.url}
                alt="聊天图片"
                className="max-h-56 max-w-full rounded-xl border border-black/5 object-cover"
              />
            </a>
          ))}
          {fileParts.map((part, idx) => (
            <a
              key={`${message.id}-file-${idx}`}
              href={part.file_url || part.payload?.url}
              download={part.file_name || part.payload?.name || '附件'}
              target="_blank"
              rel="noreferrer"
              className={`block rounded-md border px-3 py-2 ${
                isMine
                  ? 'border-white/35 bg-white/12 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              <p className="text-xs font-semibold break-all">{part.file_name || part.payload?.name || '附件'}</p>
              <p className={`text-[11px] ${isMine ? 'text-blue-100/90' : 'text-slate-400'}`}>
                {part.mime_type || 'application/octet-stream'}
                {(part.file_size || part.payload?.size) ? ` · ${formatFileSize(part.file_size || part.payload?.size)}` : ''}
              </p>
            </a>
          ))}
          {linkParts.map((part, idx) => (
            <a
              key={`${message.id}-link-${idx}`}
              href={part.payload?.url}
              target="_blank"
              rel="noreferrer"
              className={`block rounded-md border px-3 py-2 text-xs break-all ${
                isMine
                  ? 'border-white/35 bg-white/12 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {part.payload?.url}
            </a>
          ))}
          {!hasContent && '[空消息]'}
          {message.rag_sources && message.rag_sources.length > 0 && (
            <details className={`rounded-md border px-2.5 py-1.5 text-[11px] ${isMine ? 'border-white/30 bg-white/10' : 'border-slate-200 bg-slate-50/80'}`}>
              <summary className="cursor-pointer font-semibold">参考来源 ({message.rag_sources.length})</summary>
              <div className="mt-1.5 space-y-1">
                {message.rag_sources.map((src) => (
                  <p key={`${message.id}-src-${src.doc_id}-${src.source_type}`} className="break-all">
                    [{src.source_type}]
                    {src.sheet_name ? ` Sheet:${src.sheet_name}` : ''}
                    {src.row_index ? ` 行:${src.row_index}` : ''}
                    {' '}
                    {src.snippet}
                    {src.row_data && Object.keys(src.row_data).length > 0 && (
                      <span className="block mt-1 opacity-90">
                        {Object.entries(src.row_data).map(([k, v]) => `${k}:${v}`).join('；')}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
