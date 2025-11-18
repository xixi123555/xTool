import React, { useState, useRef, useEffect } from 'react';
import { TodoItemComponent } from './TodoItem';

type TodoItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

type TodoCard = {
  id: string;
  name: string;
  items: TodoItem[];
  createdAt: number;
  updatedAt: number;
};

interface TodoCardProps {
  card: TodoCard;
  onUpdateCard: (updates: Partial<Omit<TodoCard, 'id'>>) => void;
  onDeleteCard: () => void;
  onAddItem: (item: TodoItem) => void;
  onUpdateItem: (itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => void;
  onDeleteItem: (itemId: string) => void;
  isNew?: boolean;
}

export function TodoCard({ card, onUpdateCard, onDeleteCard, onAddItem, onUpdateItem, onDeleteItem, isNew = false }: TodoCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(card.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
    const newItem: TodoItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: '',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAddItem(newItem);
  };

  return (
    <div className="rounded-lg border bg-white shadow-sm transition-all">
      <div className="p-4">
        {/* 卡片名称 */}
        <div className="mb-4 pb-3 border-b border-slate-200">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameSave}
              className="w-full text-sm font-semibold border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入卡片名称..."
            />
          ) : (
            <div className="flex items-center justify-between group">
              <h4
                className="text-sm font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => {
                  setName(card.name);
                  setIsEditingName(true);
                }}
              >
                {card.name || '未命名卡片'}
              </h4>
              <button
                onClick={onDeleteCard}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="删除卡片"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* 待办事项列表 */}
        <div className="space-y-1 mb-3">
          {card.items.map((item) => {
            const isItemNew = !item.content && Date.now() - item.createdAt < 1000;
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
          className="w-full py-2 px-3 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加待办事项
        </button>
      </div>
    </div>
  );
}

