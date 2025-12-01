import React, { useEffect, useState } from 'react';
import { TodoItemComponent } from './TodoItem';
import { useIpcEvent } from '../../hooks/useIpcEvent';

type TodoItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);

  useEffect(() => {
    (async () => {
      const list = (await window.api.invoke('todo:get-all')) as TodoItem[];
      setTodos(list || []);
    })();
  }, []);

  useIpcEvent<TodoItem>('todo:new-item', (item) => {
    setTodos((prev) => [item, ...prev]);
  });

  useIpcEvent<{ id: string }>('todo:updated', ({ id }) => {
    (async () => {
      const list = (await window.api.invoke('todo:get-all')) as TodoItem[];
      setTodos(list || []);
    })();
  });

  useIpcEvent<{ id: string }>('todo:deleted', ({ id }) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  });

  const handleAdd = async () => {
    const newTodo: TodoItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: '',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setTodos((prev) => [newTodo, ...prev]);
    // 如果内容为空，暂时不保存到后端，等待用户输入后再保存
  };

  const handleUpdate = async (id: string, updates: Partial<Omit<TodoItem, 'id'>>) => {
    // 检查是否是新建的（还没有保存到后端的）
    const existingTodo = todos.find((t) => t.id === id);
    if (existingTodo && !existingTodo.content && updates.content) {
      // 新建的，需要调用 add
      const newTodo: TodoItem = {
        ...existingTodo,
        ...updates,
        updatedAt: Date.now(),
      };
      await window.api.invoke('todo:add', newTodo);
    } else {
      // 已存在的，调用 update
      await window.api.invoke('todo:update', id, updates);
    }
    const list = (await window.api.invoke('todo:get-all')) as TodoItem[];
    setTodos(list || []);
  };

  const handleDelete = async (id: string) => {
    // 检查是否是新建的（还没有保存到后端的）
    const existingTodo = todos.find((t) => t.id === id);
    if (existingTodo && !existingTodo.content) {
      // 新建的且内容为空，只删除本地状态
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    } else {
      // 已存在的，调用后端删除
      await window.api.invoke('todo:delete', id);
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
    }
  };

  return (
    <section className="flex flex-col h-full border-l border-slate-200 pl-6">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-semibold">待办事项</h3>
        <button
          onClick={handleAdd}
          className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1 pb-4">
          {todos.map((todo) => (
            <TodoItemComponent
              key={todo.id}
              item={todo}
              onUpdate={(updates) => handleUpdate(todo.id, updates)}
              onDelete={() => handleDelete(todo.id)}
              isNew={!todo.content && Date.now() - todo.createdAt < 1000}
            />
          ))}
          {todos.length === 0 && (
            <div className="text-center text-slate-400 text-sm py-8">
              暂无待办事项，点击"添加"按钮创建
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

