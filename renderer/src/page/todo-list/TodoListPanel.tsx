import React, { useEffect, useState } from 'react';
import { TodoCard } from '../../components/todo/TodoCard';
import { useIpcEvent } from '../../hooks/useIpcEvent';
import { useAppStore } from '../../store/useAppStore';
import { getTodoCards, createTodoCard, updateTodoCard, deleteTodoCard, createTodoItem, updateTodoItem, deleteTodoItem, type TodoCard as ApiTodoCard, type TodoItem as ApiTodoItem } from '../../api/todo';
import { confirm } from '../../components/confirm';
import { StarIcon, PlusIcon } from '../../assets/icons';

// 统一的类型定义（兼容本地和在线数据）
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

type TodoCardType = {
  id: string;
  name: string;
  items: TodoItem[];
  starred: boolean;
  tags: string[];
  createdAt?: number;
  updatedAt?: number;
  created_at?: number;
  updated_at?: number;
  user_id?: number;
  deleted?: boolean;
  isOnlineData?: boolean; // 是否已同步到在线数据库（仅本地数据模式使用）
};

export function TodoListPanel() {
  const { appConfig, user } = useAppStore();
  const useLocalData = appConfig.use_local_data;
  const [cards, setCards] = useState<TodoCardType[]>([]);
  const [sortByStar, setSortByStar] = useState(true);
  const [loading, setLoading] = useState(false);

  // 加载数据
  const loadCards = async () => {
    setLoading(true);
    try {
      if (useLocalData) {
        // 使用本地数据
        const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
        // 转换本地数据格式
        const converted = list.map((card) => ({
          ...card,
          created_at: card.createdAt || card.created_at,
          updated_at: card.updatedAt || card.updated_at,
          items: (card.items || []).map((item) => ({
            ...item,
            created_at: item.createdAt || item.created_at,
            updated_at: item.updatedAt || item.updated_at,
          })),
        }));
        setCards(converted);
      } else {
        // 使用在线数据
        const response = await getTodoCards();
        if (response.success && response.cards) {
          // 转换在线数据格式
          const converted = response.cards.map((card) => ({
            ...card,
            createdAt: card.created_at,
            updatedAt: card.updated_at,
            items: (card.items || []).map((item) => ({
              ...item,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            })),
          }));
          setCards(converted);
        } else {
          setCards([]);
        }
      }
    } catch (error) {
      console.error('加载待办事项失败:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [useLocalData]);

  // 只在本地数据模式下监听 IPC 事件
  useIpcEvent<TodoCardType>('todo:card-added', (card) => {
    if (useLocalData) {
      setCards((prev) => [card, ...prev]);
    }
  });

  useIpcEvent<{ cardId: string }>('todo:card-updated', () => {
    if (useLocalData) {
      loadCards();
    }
  });

  useIpcEvent<{ cardId: string }>('todo:card-deleted', ({ cardId }) => {
    if (useLocalData) {
      setCards((prev) => prev.filter((card) => card.id !== cardId));
    }
  });

  useIpcEvent<{ cardId: string }>('todo:item-updated', () => {
    if (useLocalData) {
      loadCards();
    }
  });

  const handleAddCard = async () => {
    // 获取所有卡片，计算下一个序号
    const nextNumber = cards.length + 1;
    const autoName = `待办事项(${nextNumber})`;
    const now = Date.now();
    
    if (useLocalData) {
      // 使用本地数据
      const newCard: TodoCardType = {
        id: `${now}-${Math.random().toString(36).substr(2, 9)}`,
        name: autoName,
        items: [],
        starred: false,
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      // 先添加到本地状态
      setCards((prev) => [newCard, ...prev]);
      // 立即保存到本地
      await window.api.invoke('todo:add-card', newCard);
      const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
      setCards(list || []);
    } else {
      // 使用在线数据
      const newCardId = `${now}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        await createTodoCard({
          id: newCardId,
          name: autoName,
          starred: false,
          tags: [],
        });
        await loadCards();
      } catch (error) {
        console.error('创建卡片失败:', error);
      }
    }
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<Omit<TodoCardType, 'id'>>) => {
    if (useLocalData) {
      // 使用本地数据
      const cardToUpdate = cards.find((c) => c.id === cardId);
      
      // 如果卡片已同步到在线，也需要同步更新在线数据
      if (cardToUpdate?.isOnlineData === true) {
        // 检查用户是否登录
        if (user && user.user_type !== 'guest') {
          try {
            const updateData: { name?: string; starred?: boolean; tags?: string[] } = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.starred !== undefined) updateData.starred = updates.starred;
            if (updates.tags !== undefined) updateData.tags = updates.tags;
            
            // 只有有更新的字段时才调用 API
            if (Object.keys(updateData).length > 0) {
              await updateTodoCard(cardId, updateData);
            }
          } catch (error) {
            console.error('同步更新在线卡片失败:', error);
            // 在线更新失败不影响本地更新，继续执行
          }
        }
      }
      
      // 更新本地数据
      await window.api.invoke('todo:update-card', cardId, updates);
      const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
      setCards(list || []);
    } else {
      // 使用在线数据
      try {
        const updateData: { name?: string; starred?: boolean; tags?: string[] } = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.starred !== undefined) updateData.starred = updates.starred;
        if (updates.tags !== undefined) updateData.tags = updates.tags;
        
        await updateTodoCard(cardId, updateData);
        await loadCards();
      } catch (error) {
        console.error('更新卡片失败:', error);
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    // 查找要删除的卡片，获取名称用于确认提示
    const cardToDelete = cards.find((card) => card.id === cardId);
    const cardName = cardToDelete?.name || '该卡片';
    
    // 构建确认提示信息
    let confirmMessage = `确定要删除"${cardName}"吗？删除后无法恢复。`;
    if (useLocalData && cardToDelete?.isOnlineData === true) {
      confirmMessage += '\n\n该卡片已同步到在线数据库，删除时也会删除在线数据。';
    }
    
    // 确认删除
    const confirmed = await confirm({
      title: '确认删除',
      message: confirmMessage,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'danger',
    });
    
    if (!confirmed) {
      return;
    }

    if (useLocalData) {
      // 使用本地数据
      // 如果卡片已同步到在线，也删除在线数据
      if (cardToDelete?.isOnlineData === true) {
        // 检查用户是否登录
        if (!user || user.user_type === 'guest') {
          // 未登录时只删除本地数据
          console.warn('用户未登录，只删除本地数据');
        } else {
          // 已登录时同时删除在线数据
          try {
            await deleteTodoCard(cardId);
          } catch (error) {
            console.error('删除在线卡片失败:', error);
            // 在线删除失败不影响本地删除，继续执行
          }
        }
      }
      
      // 删除本地数据
      await window.api.invoke('todo:delete-card', cardId);
      setCards((prev) => prev.filter((card) => card.id !== cardId));
    } else {
      // 使用在线数据
      try {
        // 删除服务器上的卡片
        await deleteTodoCard(cardId);
        // 同时删除本地存储中的对应卡片
        try {
          await window.api.invoke('todo:delete-card', cardId);
        } catch (localError) {
          // 本地删除失败不影响在线删除的成功，只记录错误
          console.warn('删除本地卡片失败:', localError);
        }
        await loadCards();
      } catch (error) {
        console.error('删除卡片失败:', error);
      }
    }
  };

  const handleAddItem = async (cardId: string, item: TodoItem) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    // 先更新本地状态
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, items: [item, ...(card.items || [])] } : card
      )
    );

    if (useLocalData) {
      // 使用本地数据
      // 如果 item 有内容，保存到本地
      if (item.content) {
        await window.api.invoke('todo:add-item', cardId, item);
        
        // 如果卡片已同步到在线，也需要同步添加事项到在线
        if (existingCard.isOnlineData === true) {
          // 检查用户是否登录
          if (user && user.user_type !== 'guest') {
            try {
              await createTodoItem({
                id: item.id,
                card_id: cardId,
                content: item.content,
                completed: item.completed || false,
              });
            } catch (error) {
              console.error('同步添加在线待办项失败:', error);
              // 在线添加失败不影响本地添加，继续执行
            }
          }
        }
      }
    } else {
      // 使用在线数据
      // 如果 item 有内容，保存到服务器
      if (item.content) {
        try {
          await createTodoItem({
            id: item.id,
            card_id: cardId,
            content: item.content,
            completed: item.completed || false,
          });
          await loadCards();
        } catch (error) {
          console.error('创建待办项失败:', error);
        }
      }
    }
  };

  const handleUpdateItem = async (cardId: string, itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    const existingItem = existingCard.items?.find((i) => i.id === itemId);
    if (!existingItem) return;

    // 更新本地状态
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            items: (card.items || []).map((item) =>
              item.id === itemId ? { ...item, ...updates, updated_at: Date.now() } : item
            ),
          };
        }
        return card;
      })
    );

    if (useLocalData) {
      // 使用本地数据
      // 检查是否需要保存到本地
      if (!existingItem.content && updates.content) {
        // 新建的 item，需要调用 add-item
        const newItem = {
          ...existingItem,
          ...updates,
          updatedAt: Date.now(),
        };
        await window.api.invoke('todo:add-item', cardId, newItem);
        
        // 如果卡片已同步到在线，也需要同步添加到在线
        if (existingCard.isOnlineData === true) {
          // 检查用户是否登录
          if (user && user.user_type !== 'guest') {
            try {
              await createTodoItem({
                id: itemId,
                card_id: cardId,
                content: updates.content || '',
                completed: updates.completed,
              });
            } catch (error) {
              console.error('同步添加在线待办项失败:', error);
              // 在线添加失败不影响本地添加，继续执行
            }
          }
        }
      } else if (existingItem.content) {
        // 已存在的 item，调用 update-item
        await window.api.invoke('todo:update-item', cardId, itemId, updates);
        
        // 如果卡片已同步到在线，也需要同步更新到在线
        if (existingCard.isOnlineData === true) {
          // 检查用户是否登录
          if (user && user.user_type !== 'guest') {
            try {
              // 只传递有值的字段，避免传递 undefined
              const onlineUpdates: { content?: string; completed?: boolean } = {};
              if (updates.content !== undefined) onlineUpdates.content = updates.content;
              if (updates.completed !== undefined) onlineUpdates.completed = updates.completed;
              
              // 只有有更新的字段时才调用 API
              if (Object.keys(onlineUpdates).length > 0) {
                await updateTodoItem(itemId, cardId, onlineUpdates);
              }
            } catch (error) {
              console.error('同步更新在线待办项失败:', error);
              // 在线更新失败不影响本地更新，继续执行
            }
          }
        }
      }

      // 刷新数据
      const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
      setCards(list || []);
    } else {
      // 使用在线数据
      try {
        if (!existingItem.content && updates.content) {
          // 新建的 item
          await createTodoItem({
            id: itemId,
            card_id: cardId,
            content: updates.content || '',
            completed: updates.completed,
          });
        } else if (existingItem.content) {
          // 已存在的 item
          await updateTodoItem(itemId, cardId, {
            content: updates.content,
            completed: updates.completed,
          });
        }
        await loadCards();
      } catch (error) {
        console.error('更新待办项失败:', error);
      }
    }
  };

  const handleDeleteItem = async (cardId: string, itemId: string) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    const existingItem = existingCard.items?.find((i) => i.id === itemId);
    if (!existingItem) return;

    // 更新本地状态
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === cardId) {
          return {
            ...card,
            items: (card.items || []).filter((item) => item.id !== itemId),
          };
        }
        return card;
      })
    );

    if (useLocalData) {
      // 使用本地数据
      // 如果 item 有内容（已保存到本地），需要调用本地删除
      if (existingItem.content) {
        await window.api.invoke('todo:delete-item', cardId, itemId);
        
        // 如果卡片已同步到在线，也需要同步删除在线事项
        if (existingCard.isOnlineData === true) {
          // 检查用户是否登录
          if (user && user.user_type !== 'guest') {
            try {
              await deleteTodoItem(itemId, cardId);
            } catch (error) {
              console.error('同步删除在线待办项失败:', error);
              // 在线删除失败不影响本地删除，继续执行
            }
          }
        }
      }
    } else {
      // 使用在线数据
      // 如果 item 有内容（已保存到服务器），需要调用服务器删除
      if (existingItem.content) {
        try {
          await deleteTodoItem(itemId, cardId);
          await loadCards();
        } catch (error) {
          console.error('删除待办项失败:', error);
        }
      }
    }
  };

  const sortedCards = [...cards].sort((a, b) => {
    if (sortByStar) {
      // 标星优先
      if (a.starred !== b.starred) {
        return a.starred ? -1 : 1;
      }
    }
    // 按创建时间倒序
    return (b.created_at || 0) - (a.created_at || 0);
  });

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

