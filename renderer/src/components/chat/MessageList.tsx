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
  const loadingMoreRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (loadingMoreRef.current) {
      const delta = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop = prevScrollTopRef.current + delta;
      loadingMoreRef.current = false;
      return;
    }
    // 新消息到达时始终滚到可视区域底部（用户发言/机器人回复/他人消息）
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop < 60 && hasMore && !loading && onLoadMore) {
      loadingMoreRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      prevScrollTopRef.current = el.scrollTop;
      onLoadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      className="chat-message-list h-full space-y-2 overflow-y-auto bg-transparent px-4 py-4"
      onScroll={handleScroll}
    >
      {loading && (
        <div className="py-2 text-center text-xs text-slate-400">加载中...</div>
      )}
      {!hasMore && messages.length > 0 && (
        <div className="py-2 text-center text-xs text-slate-300">已显示全部消息</div>
      )}
      {messages.length === 0 && !loading && (
        <div className="py-12 text-center text-sm text-slate-400">
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
