import { Bot, Download, FileText } from 'lucide-react';

import { cn } from '../../../shared/lib/cn';
import { formatFileSize, formatTime } from '../../../shared/lib/format';
import { Avatar, Badge } from '../../../shared/ui/Controls';
import type { ChatMessage } from '../api';

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60"
          style={{ animationDelay: `${index * 0.12}s` }}
        />
      ))}
    </span>
  );
}

export function MessageItem({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  const text = message.content_json
    .filter((part) => part.type === 'text')
    .map((part) => part.text || part.payload?.text || '')
    .join('');
  const images = message.content_json.filter(
    (part) => part.type === 'image' && (part.image_url || part.payload?.url),
  );
  const files = message.content_json.filter(
    (part) => part.type === 'file' && (part.file_url || part.payload?.url),
  );
  const links = message.content_json.filter((part) => part.type === 'link' && part.payload?.url);
  const displayName = message.is_agent
    ? message.agent_name || '智能体'
    : message.username || '匿名';

  return (
    <div className={cn('flex gap-2.5 py-1.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar src={message.avatar} name={message.is_agent ? 'AI' : displayName} size="sm" />
      <div className={cn('flex max-w-[82%] flex-col', isMine ? 'items-end' : 'items-start')}>
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-subtle">{displayName}</span>
          {message.is_agent && (
            <Badge tone="success">
              <Bot className="mr-0.5 h-3 w-3" /> 机器人
            </Badge>
          )}
          {message.pending && <Badge tone="warning">回复中</Badge>}
          {message.room_id !== 'public' && <Badge>{message.room_id}</Badge>}
          <span className="text-[11px] text-subtle">{formatTime(message.created_at)}</span>
        </div>

        <div
          className={cn(
            'space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm',
            isMine
              ? 'rounded-tr-md bg-accent text-accent-fg'
              : 'rounded-tl-md border border-line bg-surface text-fg',
          )}
        >
          {message.pending && message.is_agent ? (
            <p className="flex items-center gap-2">
              思考中 <TypingDots />
            </p>
          ) : text ? (
            <p className="whitespace-pre-wrap break-words">{text}</p>
          ) : null}

          {images.map((part, index) => {
            const url = part.image_url || part.payload?.url;
            return (
              <a
                key={`${message.id}-img-${index}`}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={url}
                  alt="聊天图片"
                  className="max-h-56 max-w-full rounded-xl border border-black/5 object-cover"
                />
              </a>
            );
          })}

          {files.map((part, index) => {
            const url = part.file_url || part.payload?.url;
            const name = part.file_name || part.payload?.name || '附件';
            const size = part.file_size || part.payload?.size;
            return (
              <a
                key={`${message.id}-file-${index}`}
                href={url}
                download={name}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-2',
                  isMine ? 'border-white/30 bg-white/10' : 'border-line bg-muted',
                )}
              >
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="min-w-0 flex-1 truncate text-xs">{name}</span>
                {size ? (
                  <span className="text-[10px] opacity-70">{formatFileSize(size)}</span>
                ) : null}
                <Download className="h-3.5 w-3.5 flex-shrink-0" />
              </a>
            );
          })}

          {links.map((part, index) => (
            <a
              key={`${message.id}-link-${index}`}
              href={part.payload?.url}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-xs underline underline-offset-2"
            >
              {part.payload?.url}
            </a>
          ))}

          {!text &&
            images.length === 0 &&
            files.length === 0 &&
            links.length === 0 &&
            !message.pending && <span className="opacity-60">[空消息]</span>}

          {message.rag_sources && message.rag_sources.length > 0 && (
            <details className="rounded-lg border border-line/60 bg-black/5 px-2 py-1.5 text-[11px]">
              <summary className="cursor-pointer font-medium">
                参考来源 ({message.rag_sources.length})
              </summary>
              <div className="mt-1.5 space-y-1 opacity-80">
                {message.rag_sources.map((source) => (
                  <p
                    key={`${message.id}-${source.doc_id}-${source.source_type}`}
                    className="break-all"
                  >
                    [{source.source_type}] {source.snippet}
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
