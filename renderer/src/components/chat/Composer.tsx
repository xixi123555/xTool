/**
 * 聊天输入框组件 — 支持 Enter 发送
 */
import { useState, useRef, useCallback } from 'react';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, disabled, placeholder = '输入消息...' }: ComposerProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-gray-200 bg-white">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed
                   max-h-24 overflow-y-auto"
        style={{ minHeight: '38px' }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium
                   hover:bg-blue-600 active:bg-blue-700 transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
      >
        发送
      </button>
    </div>
  );
}
