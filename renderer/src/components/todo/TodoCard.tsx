import React, { useState, useRef, useEffect } from 'react';
import { TodoItemComponent } from './TodoItem';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../toast/Toast';
import { createTodoCard, createTodoItem } from '../../api/todo';
import { StarIcon, LinkIcon, SyncIcon, DeleteIcon, PlusIcon, CloseIcon } from '../../assets/icons';

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
  isOnlineData?: boolean; // 是否已同步到在线数据库（仅本地数据模式使用）
};

interface TodoCardProps {
  card: TodoCard;
  onUpdateCard: (updates: Partial<Omit<TodoCard, 'id'>>) => void;
  onDeleteCard: () => void;
  onAddItem: (item: TodoItem) => void;
  onUpdateItem: (itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => void;
  onDeleteItem: (itemId: string) => void;
  isNew?: boolean;
  isLocalData?: boolean; // 是否为本地数据模式
}

export function TodoCard({ card, onUpdateCard, onDeleteCard, onAddItem, onUpdateItem, onDeleteItem, isNew = false, isLocalData = false }: TodoCardProps) {
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
    // 只在本地数据模式下才允许同步
    if (!isLocalData) {
      return;
    }

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

      // 同步成功后，更新本地卡片数据，设置 isOnlineData 为 true
      await window.api.invoke('todo:update-card', card.id, { isOnlineData: true });

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
              <StarIcon filled={card.starred} />
            </button>
            {isLocalData && card.isOnlineData === true && (
              <div className="flex items-center text-blue-600" title="已同步到在线数据库">
                <LinkIcon />
              </div>
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
            {isLocalData && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title={syncing ? '同步中...' : '同步到服务器'}
              >
                <SyncIcon spinning={syncing} />
              </button>
            )}
            <button
              onClick={onDeleteCard}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              title="删除卡片"
            >
              <DeleteIcon className="text-slate-400 hover:text-red-600" />
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
          <PlusIcon />
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
                  <CloseIcon className="h-3 w-3" />
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
                <PlusIcon className="h-3 w-3" />
                标签
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

