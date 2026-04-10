/**
 * 聊天室页面 — 实时通讯主入口
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageList } from '../../components/chat/MessageList';
import { Composer } from '../../components/chat/Composer';
import {
  fetchChatHistory,
  ChatMessage,
  ChatMessagePart,
  sendChatByRest,
  sendAgentChat,
  uploadChatFile,
} from '../../api/chatApi';
import { useNavigate } from 'react-router-dom';
import {
  connectChat,
  disconnectChat,
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
  const tempIdRef = useRef(-1);
  const navigate = useNavigate();

  const nextTempId = useCallback(() => {
    const id = tempIdRef.current;
    tempIdRef.current -= 1;
    return id;
  }, []);

  useEffect(() => {
    if (!token) return;

    connectChat(token);

    const unsubs = [
      onNewMessage((msg) => {
        setMessages((prev) => {
          const cleaned = msg.is_agent ? prev.filter((m) => !(m.is_agent && m.pending)) : prev;
          if (cleaned.some((m) => m.id === msg.id)) return cleaned;
          return [...cleaned, msg];
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

  const handleSend = useCallback(async (payload: { text?: string; files?: File[] }) => {
    if (!user) return;
    const rawText = payload.text?.trim() || '';
    if (rawText.startsWith('/bot ')) {
      const botQuestion = rawText.replace('/bot ', '').trim();
      if (!botQuestion) {
        showToast('请在 /bot 后输入问题');
        return;
      }
      const tempUserId = nextTempId();
      const tempAgentId = nextTempId();
      const createdAt = new Date().toISOString();
      const localUserMessage: ChatMessage = {
        id: tempUserId,
        room_id: 'public',
        user_id: user.id,
        content_json: [{ type: 'text', text: botQuestion, payload: { text: botQuestion } }],
        created_at: createdAt,
        username: user.username,
        avatar: user.avatar || null,
      };
      const localAgentLoadingMessage: ChatMessage = {
        id: tempAgentId,
        room_id: 'public',
        user_id: 0,
        content_json: [{ type: 'text', text: '思考中...', payload: { text: '思考中...' } }],
        created_at: createdAt,
        username: '智能体',
        is_agent: true,
        agent_name: '机器人',
        pending: true,
      };
      setMessages((prev) => [...prev, localUserMessage, localAgentLoadingMessage]);
      void sendAgentChat({ text: botQuestion, room_id: 'public', include_sources: true })
        .then((agentMessage) => {
          if (!agentMessage) return;
          setMessages((prev) => {
            const withoutLoading = prev.filter((m) => m.id !== tempAgentId);
            if (withoutLoading.some((m) => m.id === agentMessage.id)) return withoutLoading;
            return [...withoutLoading, agentMessage];
          });
        })
        .catch((err) => {
          console.error('[chat] send agent failed', err);
          showToast('机器人回复失败');
          setMessages((prev) => prev.map((m) => (
            m.id === tempAgentId
              ? {
                  ...m,
                  pending: false,
                  error: true,
                  content_json: [{ type: 'text', text: '机器人回复失败，请重试。', payload: { text: '机器人回复失败，请重试。' } }],
                }
              : m
          )));
        });
      return;
    }

    const parts: ChatMessagePart[] = [];
    const text = rawText;
    if (text) parts.push({ type: 'text', text, payload: { text } });

    const files = payload.files ?? [];
    for (const file of files) {
      const uploaded = await uploadChatFile(file);
      if (!uploaded) continue;
      if ((uploaded.mime_type || '').startsWith('image/')) {
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
    await sendChatByRest({ parts, room_id: 'public' });
  }, [nextTempId, user]);

  if (!user || !token) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        请先登录后使用聊天室
      </div>
    );
  }

  return (
    <div
      className="chat-room-shell flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
      style={{ fontFamily: '"SF Pro Display","PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif' }}
    >
      {/* 顶栏 */}
      <div className="chat-room-header relative border-b border-slate-200/70 bg-white/85 px-5 py-4 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-cyan-200/20 via-sky-200/10 to-indigo-200/20" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-[30px] font-bold tracking-tight text-slate-800">聊天室</h2>
          </div>
          <div className="chat-room-online flex items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50/70 px-4 py-2">
            <button
              type="button"
              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
              onClick={() => navigate('/chat/orchestrator')}
            >
              智能体编排
            </button>
            <button
              type="button"
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-100"
              onClick={() => navigate('/chat/kb-upload')}
            >
              知识库上传
            </button>
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-300'}`}
            />
            <span className="text-base font-semibold text-slate-600">
              {connected ? `${onlineCount} 人在线` : '连接中...'}
            </span>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-room-message-wrap relative flex-1 min-h-0 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-10 top-16 h-40 w-40 rounded-full bg-cyan-200/20 blur-3xl" />
          <div className="absolute -right-10 bottom-12 h-44 w-44 rounded-full bg-indigo-200/20 blur-3xl" />
        </div>
        <MessageList
          messages={messages}
          currentUserId={user.id}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
        />
      </div>

      {/* 输入框 */}
      <Composer
        onSend={handleSend}
        disabled={!connected}
        placeholder={connected ? '输入消息，Enter 发送；/bot 问题 可呼叫机器人...' : '等待连接...'}
      />
    </div>
  );
}
