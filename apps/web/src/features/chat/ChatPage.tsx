import { BookOpen, Network } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { errorMessage } from '../../shared/lib/http';
import { isGuest, useAuthStore } from '../../shared/store/auth';
import { toast } from '../../shared/store/feedback';
import { cn } from '../../shared/lib/cn';
import {
  fetchChatHistory,
  sendAgentMessage,
  sendChat,
  uploadChatFile,
  type ChatMessage,
  type ChatMessagePart,
} from './api';
import {
  connectChat,
  disconnectChat,
  onChatError,
  onConnectionChange,
  onNewMessage,
  onOnlineCount,
} from './socket';
import { Composer } from './components/Composer';
import { MessageList } from './components/MessageList';

const PAGE_SIZE = 100;

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const tempIdRef = useRef(-1);

  const nextTempId = useCallback(() => {
    const id = tempIdRef.current;
    tempIdRef.current -= 1;
    return id;
  }, []);

  useEffect(() => {
    if (!token) return;
    connectChat(token);
    const unsubscribers = [
      onNewMessage((message) => {
        setMessages((current) => {
          const cleaned = message.is_agent
            ? current.filter((item) => !(item.is_agent && item.pending))
            : current;
          if (cleaned.some((item) => item.id === message.id)) return cleaned;
          return [...cleaned, message];
        });
      }),
      onOnlineCount(({ count }) => setOnlineCount(count)),
      onChatError(({ message }) => toast(message, 'error')),
      onConnectionChange((value) => {
        setConnected(value);
        if (!value) toast('连接已断开，正在重连…', 'default');
      }),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      disconnectChat();
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchChatHistory('public', PAGE_SIZE)
      .then((history) => {
        setMessages(history);
        setHasMore(history.length >= PAGE_SIZE);
      })
      .catch((error) => toast(errorMessage(error, '加载历史消息失败'), 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoading(true);
    fetchChatHistory('public', PAGE_SIZE, oldest.id)
      .then((older) => {
        if (older.length < PAGE_SIZE) setHasMore(false);
        setMessages((current) => [...older, ...current]);
      })
      .catch(() => toast('加载更多失败', 'error'))
      .finally(() => setLoading(false));
  }, [hasMore, loading, messages]);

  const handleSend = useCallback(
    async ({ text, files }: { text?: string; files?: File[] }) => {
      if (!user) return;
      const raw = text?.trim() ?? '';

      if (raw.startsWith('/bot ')) {
        const question = raw.slice(5).trim();
        if (!question) {
          toast('请在 /bot 后输入问题', 'error');
          return;
        }
        const userId = nextTempId();
        const agentId = nextTempId();
        const createdAt = new Date().toISOString();
        setMessages((current) => [
          ...current,
          {
            id: userId,
            room_id: 'public',
            user_id: user.id,
            content_json: [{ type: 'text', text: question, payload: { text: question } }],
            created_at: createdAt,
            username: user.username,
            avatar: user.avatar,
          },
          {
            id: agentId,
            room_id: 'public',
            user_id: 0,
            content_json: [{ type: 'text', text: '思考中…', payload: { text: '思考中…' } }],
            created_at: createdAt,
            username: '智能体',
            is_agent: true,
            agent_name: '机器人',
            pending: true,
          },
        ]);

        try {
          const agentMessage = await sendAgentMessage(question);
          if (!agentMessage) return;
          setMessages((current) => {
            const withoutLoading = current.filter((item) => item.id !== agentId);
            return withoutLoading.some((item) => item.id === agentMessage.id)
              ? withoutLoading
              : [...withoutLoading, agentMessage];
          });
        } catch (error) {
          setMessages((current) =>
            current.map((item) =>
              item.id === agentId
                ? {
                    ...item,
                    pending: false,
                    error: true,
                    content_json: [
                      {
                        type: 'text',
                        text: '机器人回复失败，请重试。',
                        payload: { text: '机器人回复失败，请重试。' },
                      },
                    ],
                  }
                : item,
            ),
          );
          toast(errorMessage(error, '机器人回复失败'), 'error');
        }
        return;
      }

      const parts: ChatMessagePart[] = [];
      if (raw) parts.push({ type: 'text', text: raw, payload: { text: raw } });

      for (const file of files ?? []) {
        const uploaded = await uploadChatFile(file);
        if (!uploaded) continue;
        if (uploaded.mime_type.startsWith('image/')) {
          parts.push({
            type: 'image',
            image_url: uploaded.url,
            mime_type: uploaded.mime_type,
            payload: {
              url: uploaded.url,
              name: uploaded.name,
              size: uploaded.size,
              mime_type: uploaded.mime_type,
            },
          });
        } else {
          parts.push({
            type: 'file',
            file_url: uploaded.url,
            file_name: uploaded.name,
            file_size: uploaded.size,
            mime_type: uploaded.mime_type,
            payload: {
              url: uploaded.url,
              name: uploaded.name,
              size: uploaded.size,
              mime_type: uploaded.mime_type,
            },
          });
        }
      }

      if (parts.length === 0) return;
      const sent = await sendChat(parts);
      if (sent) {
        setMessages((current) =>
          current.some((item) => item.id === sent.id) ? current : [...current, sent],
        );
      }
    },
    [nextTempId, user],
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-fg">聊天室</h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle">
            <span
              className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-success' : 'bg-line')}
            />
            {connected ? `${onlineCount} 人在线` : '连接中…'}
          </div>
        </div>
        {!isGuest(user) && (
          <div className="flex items-center gap-1.5">
            <Link to="/ai/knowledge" className="btn-secondary px-2.5 py-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              知识库
            </Link>
            <Link to="/ai/orchestrator" className="btn-secondary px-2.5 py-1.5 text-xs">
              <Network className="h-3.5 w-3.5" />
              编排
            </Link>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 bg-canvas">
        <MessageList
          messages={messages}
          currentUserId={user?.id ?? 0}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
        />
      </div>

      <Composer
        disabled={!connected}
        placeholder={connected ? '输入消息，Enter 发送；/bot 问题 呼叫机器人' : '等待连接…'}
        onSend={handleSend}
      />
    </div>
  );
}
