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

export function MessageItem({ message, isMine }: MessageItemProps) {
  const textParts = message.content_json
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('');

  const avatar = message.avatar ? (
    <img
      src={message.avatar}
      alt={message.username}
      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
    />
  ) : (
    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
      {getAvatarText(message.username)}
    </div>
  );

  return (
    <div className={`flex gap-2 px-3 py-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {avatar}
      <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-xs text-gray-400">{message.username}</span>
          {message.room_id && message.room_id !== 'public' && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">
              {message.room_id}
            </span>
          )}
          <span className="text-xs text-gray-300">{formatTime(message.created_at)}</span>
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap ${
            isMine
              ? 'bg-blue-500 text-white rounded-tr-sm'
              : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
          }`}
        >
          {textParts || '[空消息]'}
        </div>
      </div>
    </div>
  );
}
