/**
 * 聊天消息列表 — 自动滚动、加载更多
 */
import { useEffect, useRef, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import type { ChatMessage } from '../../api/chatApi';

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
  loading,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScroll.current = isAtBottom;

    if (el.scrollTop < 60 && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto py-3 space-y-1 bg-gray-50"
      onScroll={handleScroll}
    >
      {loading && (
        <div className="text-center text-xs text-gray-400 py-2">加载中...</div>
      )}
      {!hasMore && messages.length > 0 && (
        <div className="text-center text-xs text-gray-300 py-2">已显示全部消息</div>
      )}
      {messages.length === 0 && !loading && (
        <div className="text-center text-gray-400 text-sm py-10">
          暂无消息，发一条开始聊天吧
        </div>
      )}
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isMine={msg.user_id === currentUserId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
