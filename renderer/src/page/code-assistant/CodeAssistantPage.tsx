/**
 * Claude 风格代码助手 — 主区域对话 + 底部输入框
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { streamClaudeChat, type ClaudeChatTurn } from '../../api/claudeCodeApi';
import { showToast } from '../../components/toast/Toast';

type UiMessage = { id: string; role: 'user' | 'assistant'; content: string };

export function CodeAssistantPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    const assistantId = crypto.randomUUID();
    const assistantPlaceholder: UiMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInput('');
    setBusy(true);

    const history: ClaudeChatTurn[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      for await (const chunk of streamClaudeChat(history)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '请求失败';
      showToast(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-[#303030] text-[#e8e8e8] shadow-xl ring-1 ring-black/20">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-5 py-3.5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">Code</h1>
          <p className="text-xs text-white/50">由 Claude 提供编程与排错辅助</p>
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8"
      >
        {messages.length === 0 && (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center pt-16 text-center">
            <p className="text-2xl font-medium text-white/90">有什么代码问题？</p>
            <p className="mt-2 max-w-md text-sm text-white/45">
              描述需求、粘贴报错栈或贴代码片段，我会帮你分析与改写。
            </p>
          </div>
        )}

        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[min(100%,48rem)] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#3f3f3f] text-white'
                    : 'bg-transparent text-[#e8e8e8]'
                }`}
              >
                {m.role === 'assistant' && m.content === '' && busy ? (
                  <span className="inline-flex gap-1 text-white/40">
                    <span className="animate-pulse">思考中</span>
                    <span className="animate-pulse delay-75">·</span>
                    <span className="animate-pulse delay-150">·</span>
                    <span className="animate-pulse delay-200">·</span>
                  </span>
                ) : (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-white/10 p-4 md:p-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="relative rounded-3xl border border-white/12 bg-[#3f3f3f] shadow-inner">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="询问编程问题…（Enter 发送，Shift+Enter 换行）"
              disabled={busy}
              rows={3}
              className="max-h-48 min-h-[5.5rem] w-full resize-y rounded-3xl bg-transparent px-5 py-4 pr-24 text-[15px] text-white placeholder:text-white/35 outline-none focus:ring-0 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={busy || !input.trim()}
              className="absolute bottom-3 right-3 rounded-2xl bg-[#d97757] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#c96849] disabled:cursor-not-allowed disabled:opacity-40"
            >
              发送
            </button>
          </div>
          <p className="px-1 text-center text-[11px] text-white/35">
            回答由 Anthropic Claude 生成；请勿提交密钥或敏感未脱敏代码。
          </p>
        </div>
      </div>
    </div>
  );
}
