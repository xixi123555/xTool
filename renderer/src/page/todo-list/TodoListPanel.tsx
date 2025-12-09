import React from 'react';
import { TodoCard } from '../../components/todo/TodoCard';
import { StarIcon, PlusIcon } from '../../assets/icons';
import { useTodoListData } from './useTodoListData';

export function TodoListPanel() {
  const {
    sortedCards,
    loading,
    sortByStar,
    setSortByStar,
    useLocalData,
    handleAddCard,
    handleUpdateCard,
    handleDeleteCard,
    handleAddItem,
    handleUpdateItem,
    handleDeleteItem,
  } = useTodoListData();

  if (loading) {
    return (
      <section className="flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-slate-500">加载中...</div>
        </div>
      </section>
    );
  }

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
            <StarIcon filled={sortByStar} />
          </button>
        </div>
        <button
          onClick={handleAddCard}
          className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1.5"
        >
          <PlusIcon />
          添加卡片
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {sortedCards.length === 0 ? (
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
                      isLocalData={useLocalData}
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
                      isLocalData={useLocalData}
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

