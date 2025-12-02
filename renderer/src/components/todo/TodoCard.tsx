import React, { useState, useRef, useEffect } from 'react';
import { TodoItemComponent } from './TodoItem';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../toast/Toast';
import { createTodoCard, createTodoItem } from '../../api/todo';

type TodoItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt?: number;
  updatedAt?: number;
  created_at?: number;
  updated_at?: number;
};

type TodoCard = {
  id: string;
  name: string;
  items: TodoItem[];
  starred: boolean;
  tags: string[];
  createdAt?: number;
  updatedAt?: number;
  created_at?: number;
  updated_at?: number;
};

interface TodoCardProps {
  card: TodoCard;
  onUpdateCard: (updates: Partial<Omit<TodoCard, 'id'>>) => void;
  onDeleteCard: () => void;
  onAddItem: (item: TodoItem) => void;
  onUpdateItem: (itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => void;
  onDeleteItem: (itemId: string) => void;
  isNew?: boolean;
  isOnlineData?: boolean;
}

export function TodoCard({ card, onUpdateCard, onDeleteCard, onAddItem, onUpdateItem, onDeleteItem, isNew = false, isOnlineData = false }: TodoCardProps) {
  const { user } = useAppStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(card.name);
  const [isEditingTag, setIsEditingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(card.name);
  }, [card.name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSave = () => {
    if (name.trim()) {
      onUpdateCard({ name: name.trim() });
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setName(card.name);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const handleAddItem = () => {
    const now = Date.now();
    const newItem: TodoItem = {
      id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
      content: '',
      completed: false,
      createdAt: now,
      updatedAt: now,
      created_at: now,
      updated_at: now,
    };
    onAddItem(newItem);
  };

  const handleToggleStar = () => {
    onUpdateCard({ starred: !card.starred });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !card.tags.includes(tagInput.trim())) {
      onUpdateCard({ tags: [...card.tags, tagInput.trim()] });
      setTagInput('');
      setIsEditingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateCard({ tags: card.tags.filter((tag) => tag !== tagToRemove) });
  };

  // 同步本地数据到数据库
  const handleSync = async () => {
    // 检查用户身份
    if (!user || user.user_type === 'guest') {
      showToast('请登录后再同步数据');
      return;
    }

    setSyncing(true);
    try {
      // 创建卡片
      await createTodoCard({
        id: card.id,
        name: card.name,
        starred: card.starred,
        tags: card.tags,
      });

      // 创建卡片下的所有待办项
      for (const item of card.items) {
        if (item.content) {
          // 只同步有内容的项
          await createTodoItem({
            id: item.id,
            card_id: card.id,
            content: item.content,
            completed: item.completed || false,
          });
        }
      }

      showToast('同步成功');
    } catch (error) {
      console.error('同步失败:', error);
      showToast('同步失败，请稍后重试');
    } finally {
      setSyncing(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setTagInput('');
      setIsEditingTag(false);
    }
  };

  useEffect(() => {
    if (isEditingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isEditingTag]);

  return (
    <div className="rounded-lg border bg-white shadow-sm transition-all">
      <div className="p-4">
        {/* 卡片头部：标星 + 名称 + 删除 */}
        <div className="mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-2 group">
            <button
              onClick={handleToggleStar}
              className="p-1 hover:bg-slate-100 rounded transition-colors flex-shrink-0"
              title={card.starred ? '取消标星' : '标星'}
            >
              {card.starred ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.5L14.25 8.5L20.5 9.25L16 13.25L17.25 19.5L12 16.5L6.75 19.5L8 13.25L3.5 9.25L9.75 8.5L12 2.5Z" fillRule="evenodd" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
            </button>
            {isOnlineData && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded" title="在线数据">
                在线
              </span>
            )}
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                className="flex-1 text-sm font-semibold border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="输入卡片名称..."
              />
            ) : (
            <h4
              className="flex-1 text-sm font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => {
                setName(card.name);
                setIsEditingName(true);
              }}
            >
              {card.name || '未命名卡片'}
            </h4>
            )}
            {/* 同步按钮（只在本地数据模式下显示） */}
            {!isOnlineData && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={syncing ? '同步中...' : '同步到服务器'}
              >
                {syncing ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={onDeleteCard}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="删除卡片"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* 待办事项列表 */}
        <div className="space-y-1 mb-3">
          {card.items.map((item) => {
            const createdAt = item.createdAt || item.created_at || 0;
            const isItemNew = !item.content && Date.now() - createdAt < 1000;
            return (
              <TodoItemComponent
                key={item.id}
                item={item}
                onUpdate={(updates) => onUpdateItem(item.id, updates)}
                onDelete={() => onDeleteItem(item.id)}
                isNew={isItemNew}
              />
            );
          })}
        </div>

        {/* 添加待办事项按钮 */}
        <button
          onClick={handleAddItem}
          className="w-full py-2 px-3 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center gap-2 mb-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加待办事项
        </button>

        {/* 底部：时间和标签 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <span className="text-xs text-slate-400">
            {new Date(card.createdAt || card.created_at || 0).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600 transition-colors"
                  title="删除标签"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {isEditingTag ? (
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  if (tagInput.trim()) {
                    handleAddTag();
                  } else {
                    setIsEditingTag(false);
                  }
                }}
                className="w-20 px-2 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="标签..."
              />
            ) : (
              <button
                onClick={() => setIsEditingTag(true)}
                className="inline-flex items-center px-2 py-0.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="添加标签"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                标签
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

