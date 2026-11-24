import { Loader2, MessageSquare } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { ChatMessage } from '../api';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  currentUserId,
  hasMore,
  loading,
  onLoadMore,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages]);

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="scrollbar-thin h-full overflow-y-auto px-3 py-3 md:px-5"
    >
      {hasMore && (
        <div className="mb-2 text-center">
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            加载更早的消息
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <MessageSquare className="h-8 w-8 text-subtle" />
          <p className="mt-2 text-sm font-medium text-fg">还没有消息</p>
          <p className="mt-1 text-xs text-subtle">发送第一条，或在输入框用 /bot 呼叫机器人。</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isMine={message.user_id === currentUserId}
          />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
