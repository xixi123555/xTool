import React, { useEffect, useState } from 'react';
import { TodoCard } from '../../components/todo/TodoCard';
import { useIpcEvent } from '../../hooks/useIpcEvent';

type TodoItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

type TodoCardType = {
  id: string;
  name: string;
  items: TodoItem[];
  starred: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export function TodoListPanel() {
  const [cards, setCards] = useState<TodoCardType[]>([]);
  const [sortByStar, setSortByStar] = useState(true);

  useEffect(() => {
    (async () => {
      const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
      setCards(list || []);
    })();
  }, []);

  useIpcEvent<TodoCardType>('todo:card-added', (card) => {
    setCards((prev) => [card, ...prev]);
  });

  useIpcEvent<{ cardId: string }>('todo:card-updated', () => {
    (async () => {
      const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
      setCards(list || []);
    })();
  });

  useIpcEvent<{ cardId: string }>('todo:card-deleted', ({ cardId }) => {
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  });

  useIpcEvent<{ cardId: string }>('todo:item-updated', () => {
    (async () => {
      const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
      setCards(list || []);
    })();
  });

  const handleAddCard = async () => {
    // 获取所有卡片，计算下一个序号
    const allCards = (await window.api.invoke('todo:get-all')) as TodoCardType[];
    const nextNumber = allCards.length + 1;
    const autoName = `待办事项(${nextNumber})`;
    
    const newCard: TodoCardType = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: autoName,
      items: [],
      starred: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // 先添加到本地状态
    setCards((prev) => [newCard, ...prev]);
    // 立即保存到后端
    await window.api.invoke('todo:add-card', newCard);
    const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
    setCards(list || []);
  };

  const sortedCards = [...cards].sort((a, b) => {
    if (sortByStar) {
      // 标星优先
      if (a.starred !== b.starred) {
        return a.starred ? -1 : 1;
      }
    }
    // 按创建时间倒序
    return b.createdAt - a.createdAt;
  });

  const handleUpdateCard = async (cardId: string, updates: Partial<Omit<TodoCardType, 'id'>>) => {
    // 直接调用 updateCard
    await window.api.invoke('todo:update-card', cardId, updates);
    const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
    setCards(list || []);
  };

  const handleDeleteCard = async (cardId: string) => {
    await window.api.invoke('todo:delete-card', cardId);
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  const handleAddItem = async (cardId: string, item: TodoItem) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (existingCard) {
      // 先更新本地状态
      setCards((prev) =>
        prev.map((card) =>
          card.id === cardId ? { ...card, items: [item, ...card.items] } : card
        )
      );

      // 如果卡片还没有保存到后端，先保存卡片
      if (!existingCard.name) {
        // 卡片还没保存，暂时不保存 item，等卡片保存后再保存 item
        return;
      }

      // 如果 item 有内容，保存到后端
      if (item.content) {
        await window.api.invoke('todo:add-item', cardId, item);
      } else {
        // 空 item，只保留在本地，等有内容后再保存
      }
    }
  };

  const handleUpdateItem = async (cardId: string, itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    const existingItem = existingCard.items.find((i) => i.id === itemId);
    if (!existingItem) return;

    // 更新本地状态
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            items: card.items.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          };
        }
        return card;
      })
    );

    // 检查是否需要保存到后端
    if (!existingItem.content && updates.content) {
      // 新建的 item，需要调用 add-item
      const newItem: TodoItem = {
        ...existingItem,
        ...updates,
        updatedAt: Date.now(),
      };
      await window.api.invoke('todo:add-item', cardId, newItem);
    } else if (existingItem.content) {
      // 已存在的 item，调用 update-item
      await window.api.invoke('todo:update-item', cardId, itemId, updates);
    }

    // 刷新数据
    const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
    setCards(list || []);
  };

  const handleDeleteItem = async (cardId: string, itemId: string) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    const existingItem = existingCard.items.find((i) => i.id === itemId);
    if (!existingItem) return;

    // 更新本地状态
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            items: card.items.filter((item) => item.id !== itemId),
          };
        }
        return card;
      })
    );

    // 如果 item 有内容（已保存到后端），需要调用后端删除
    if (existingItem.content) {
      await window.api.invoke('todo:delete-item', cardId, itemId);
    }
  };

  return (
    <section className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">待办事项</h3>
          <button
            onClick={() => setSortByStar(!sortByStar)}
            className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            title={sortByStar ? '按标星排序' : '按时间排序'}
          >
            {sortByStar ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.5L14.25 8.5L20.5 9.25L16 13.25L17.25 19.5L12 16.5L6.75 19.5L8 13.25L3.5 9.25L9.75 8.5L12 2.5Z" fillRule="evenodd" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </button>
        </div>
        <button
          onClick={handleAddCard}
          className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加卡片
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {cards.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">
            暂无待办事项，点击"添加卡片"按钮创建
          </div>
        ) : (
          <div className="flex gap-3 pb-4">
            {/* 左列：单数序号 (0, 2, 4...) */}
            <div className="flex-1 space-y-3">
              {sortedCards.map((card, index) => {
                if (index % 2 === 0) {
                  return (
                    <TodoCard
                      key={card.id}
                      card={card}
                      onUpdateCard={(updates) => handleUpdateCard(card.id, updates)}
                      onDeleteCard={() => handleDeleteCard(card.id)}
                      onAddItem={(item) => handleAddItem(card.id, item)}
                      onUpdateItem={(itemId, updates) => handleUpdateItem(card.id, itemId, updates)}
                      onDeleteItem={(itemId) => handleDeleteItem(card.id, itemId)}
                    />
                  );
                }
                return null;
              })}
            </div>
            {/* 右列：双数序号 (1, 3, 5...) */}
            <div className="flex-1 space-y-3">
              {sortedCards.map((card, index) => {
                if (index % 2 === 1) {
                  return (
                    <TodoCard
                      key={card.id}
                      card={card}
                      onUpdateCard={(updates) => handleUpdateCard(card.id, updates)}
                      onDeleteCard={() => handleDeleteCard(card.id)}
                      onAddItem={(item) => handleAddItem(card.id, item)}
                      onUpdateItem={(itemId, updates) => handleUpdateItem(card.id, itemId, updates)}
                      onDeleteItem={(itemId) => handleDeleteItem(card.id, itemId)}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

