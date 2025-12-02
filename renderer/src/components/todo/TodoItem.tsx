import React, { useState, useRef, useEffect } from 'react';

type TodoItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt?: number;
  updatedAt?: number;
  created_at?: number;
  updated_at?: number;
  card_id?: string;
  deleted?: boolean;
};

interface TodoItemProps {
  item: TodoItem;
  onUpdate: (updates: Partial<Omit<TodoItem, 'id'>>) => void;
  onDelete: () => void;
  isNew?: boolean;
}

export function TodoItemComponent({ item, onUpdate, onDelete, isNew = false }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(isNew);
  const [content, setContent] = useState(item.content);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (isNew) {
        inputRef.current.select();
      }
    }
  }, [isEditing, isNew]);

  const handleSave = () => {
    if (content.trim()) {
      onUpdate({ content: content.trim() });
      setIsEditing(false);
    } else {
      if (!isNew) {
        onDelete();
      } else {
        onDelete();
      }
    }
  };

  const handleCancel = () => {
    if (isNew) {
      onDelete();
    } else {
      setContent(item.content);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleToggleComplete = () => {
    onUpdate({ completed: !item.completed });
  };

  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors group ${
      item.completed ? 'opacity-60' : ''
    }`}>
      <button
        onClick={handleToggleComplete}
        className={`w-4 h-4 rounded border-2 flex-shrink-0 transition-all ${
          item.completed
            ? 'bg-green-600 border-green-600'
            : 'border-slate-300 hover:border-green-500'
        }`}
        title={item.completed ? '标记为未完成' : '标记为完成'}
      >
        {item.completed && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入待办事项..."
        />
      ) : (
        <>
          <p
            className={`flex-1 text-sm cursor-pointer ${
              item.completed ? 'line-through text-slate-400' : 'text-slate-700'
            }`}
            onClick={() => setIsEditing(true)}
          >
            {item.content || '空待办事项'}
          </p>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="编辑"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="删除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

