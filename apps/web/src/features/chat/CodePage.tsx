import { Bot, Loader2, SendHorizontal, Square, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { errorMessage } from '../../shared/lib/http';
import { cn } from '../../shared/lib/cn';
import { toast } from '../../shared/store/feedback';
import { streamClaudeChat, type ClaudeTurn } from './claude';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function createUiId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function CodePage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userMessage: UiMessage = { id: createUiId(), role: 'user', content: text };
    const assistantId = createUiId();
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setBusy(true);
    controllerRef.current = new AbortController();

    const history: ClaudeTurn[] = [...messages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    try {
      for await (const chunk of streamClaudeChat(history, controllerRef.current.signal)) {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: message.content + chunk } : message,
          ),
        );
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      toast(errorMessage(error, '请求失败'), 'error');
      setMessages((current) =>
        current.filter((message) => message.id !== assistantId || message.content),
      );
    } finally {
      setBusy(false);
      controllerRef.current = null;
    }
  };

  const handleStop = () => {
    controllerRef.current?.abort();
    setBusy(false);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-line bg-surface px-4 py-3 md:px-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-fg">代码助手</h1>
          <p className="mt-0.5 text-xs text-subtle">粘贴报错、代码或需求，让 Claude 帮你分析</p>
        </div>
        <button
          type="button"
          className="btn-ghost h-8 px-2 text-xs"
          onClick={() => setMessages([])}
          disabled={busy || messages.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5" />
          清空
        </button>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center pt-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Bot className="h-6 w-6" />
            </span>
            <p className="mt-3 text-base font-semibold text-fg">有什么代码问题？</p>
            <p className="mt-1 text-sm leading-6 text-subtle">
              描述需求、粘贴报错栈或代码片段。回答会边生成边显示。
            </p>
            <div className="mt-5 grid w-full gap-2 text-left sm:grid-cols-2">
              {['解释这段代码', '帮我定位报错', '写一个单元测试', '重构这个函数'].map((hint) => (
                <button
                  key={hint}
                  type="button"
                  className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-subtle transition hover:border-accent/40 hover:text-fg"
                  onClick={() => setInput(hint)}
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2.5',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-accent text-accent-fg'
                      : 'bg-accent-soft text-accent',
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </span>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6',
                    message.role === 'user'
                      ? 'rounded-tr-md bg-accent text-accent-fg'
                      : 'rounded-tl-md border border-line bg-surface text-fg',
                  )}
                >
                  {message.content ? (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  ) : (
                    <span className="flex items-center gap-2 text-subtle">
                      <Loader2 className="h-4 w-4 animate-spin" /> 思考中…
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="safe-bottom border-t border-line bg-surface p-2.5 md:p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-1.5 rounded-2xl border border-line bg-canvas p-1.5">
          <textarea
            rows={1}
            className="max-h-40 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 text-fg outline-none placeholder:text-subtle"
            placeholder="输入问题，Enter 发送，Shift+Enter 换行"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            disabled={busy}
          />
          {busy ? (
            <button
              type="button"
              className="btn-secondary h-9 w-9 flex-shrink-0 p-0"
              onClick={handleStop}
              aria-label="停止"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary h-9 w-9 flex-shrink-0 p-0"
              onClick={() => void handleSend()}
              disabled={!input.trim()}
              aria-label="发送"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mx-auto mt-1 max-w-3xl text-[11px] text-subtle">
          由服务端代理 Claude，密钥不会出现在浏览器。
        </p>
      </div>
    </div>
  );
}
