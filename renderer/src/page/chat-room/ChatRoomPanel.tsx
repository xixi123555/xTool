/**
 * 聊天室页面 — 实时通讯主入口
 */
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageList } from '../../components/chat/MessageList';
import { Composer } from '../../components/chat/Composer';
import { fetchChatHistory, ChatMessage } from '../../api/chatApi';
import {
  connectChat,
  disconnectChat,
  sendChatMessage,
  onNewMessage,
  onOnlineCount,
  onChatError,
  onConnectionChange,
} from '../../api/chatSocket';
import { showToast } from '../../components/toast/Toast';

/** 单次拉取条数（服务端最大 200）；合并全部房间历史 */
const PAGE_SIZE = 100;
const HISTORY_OPTS = { allRooms: true } as const;

export function ChatRoomPanel() {
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!token) return;

    connectChat(token);

    const unsubs = [
      onNewMessage((msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }),
      onOnlineCount(({ count }) => setOnlineCount(count)),
      onChatError(({ message }) => showToast(message)),
      onConnectionChange((c) => {
        setConnected(c);
        if (!c) showToast('连接已断开，正在重连...', 2000);
      }),
    ];

    return () => {
      unsubs.forEach((u) => u());
      disconnectChat();
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    fetchChatHistory('public', PAGE_SIZE, undefined, HISTORY_OPTS)
      .then((msgs) => {
        setMessages(msgs);
        setHasMore(msgs.length >= PAGE_SIZE);
      })
      .catch((err) => {
        console.error('[chat] load history failed', err);
        showToast('加载历史消息失败');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoading(true);
    fetchChatHistory('public', PAGE_SIZE, oldest.id, HISTORY_OPTS)
      .then((older) => {
        if (older.length < PAGE_SIZE) setHasMore(false);
        setMessages((prev) => [...older, ...prev]);
      })
      .catch(() => showToast('加载更多失败'))
      .finally(() => setLoading(false));
  }, [loading, hasMore, messages]);

  const handleSend = useCallback((text: string) => {
    sendChatMessage(text);
  }, []);

  if (!user || !token) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        请先登录后使用聊天室
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">聊天室</h2>
          <p className="text-xs text-gray-400">
            查看全部房间历史记录（含他人与离线期间消息）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-300'}`}
          />
          <span className="text-xs text-gray-500">
            {connected ? `${onlineCount} 人在线` : '连接中...'}
          </span>
        </div>
      </div>

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        currentUserId={user.id}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loading={loading}
      />

      {/* 输入框 */}
      <Composer
        onSend={handleSend}
        disabled={!connected}
        placeholder={connected ? '输入消息，Enter 发送...' : '等待连接...'}
      />
    </div>
  );
}
