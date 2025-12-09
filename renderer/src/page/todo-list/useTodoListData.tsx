import { useEffect, useState, useMemo } from 'react';
import { useIpcEvent } from '../../hooks/useIpcEvent';
import { useAppStore } from '../../store/useAppStore';
import {
  getTodoCards,
  createTodoCard,
  updateTodoCard,
  deleteTodoCard,
  createTodoItem,
  updateTodoItem,
  deleteTodoItem,
} from '../../api/todo';
import { confirm } from '../../components/confirm';

// 统一的类型定义（兼容本地和在线数据）
export type TodoItem = {
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

export type TodoCardType = {
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

export function useTodoListData() {
  const { appConfig, user } = useAppStore();
  const useLocalData = appConfig.use_local_data;
  const [cards, setCards] = useState<TodoCardType[]>([]);
  const [sortByStar, setSortByStar] = useState(true);
  const [loading, setLoading] = useState(false);

  const isLogin = useMemo(() => {
    return user && user.user_type !== 'guest';
  }, [user?.user_type]);

  // ==================== 数据加载 ====================
  const loadLocalCards = async () => {
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
  };

  const loadOnlineCards = async () => {
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
  };

  const loadCards = async () => {
    setLoading(true);
    try {
      if (useLocalData) {
        await loadLocalCards();
      } else {
        await loadOnlineCards();
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

  // ==================== IPC 事件监听 ====================
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

  // ==================== 卡片操作 - 本地数据 ====================
  const localCardDataAdd = async (newCard: TodoCardType) => {
    // 先添加到本地状态
    setCards((prev) => [newCard, ...prev]);
    // 立即保存到本地
    await window.api.invoke('todo:add-card', newCard);
    const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
    setCards(list || []);
  };

  const localCardDataUpdate = async (cardId: string, updates: Partial<Omit<TodoCardType, 'id'>>) => {
    // 更新本地数据
    await window.api.invoke('todo:update-card', cardId, updates);
    const list = (await window.api.invoke('todo:get-all')) as TodoCardType[];
    setCards(list || []);
  };

  const localCardDataDelete = async (cardId: string) => {
    // 删除本地数据
    await window.api.invoke('todo:delete-card', cardId);
    setCards((prev) => prev.filter((card) => card.id !== cardId));
  };

  // ==================== 卡片操作 - 在线数据 ====================
  const onlineCardDataAdd = async (newCardId: string, autoName: string) => {
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
  };

  const onlineCardDataUpdate = async (cardId: string, updates: Partial<Omit<TodoCardType, 'id'>>) => {
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
  };

  const onlineCardDataDelete = async (cardId: string) => {
    try {
      // 删除服务器上的卡片
      await deleteTodoCard(cardId);
      await loadCards();
    } catch (error) {
      console.error('删除卡片失败:', error);
    }
  };

  // ==================== 待办项操作 - 本地数据 ====================
  const localItemDataAdd = async (cardId: string, item: TodoItem) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    // 先更新本地状态
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, items: [item, ...(card.items || [])] } : card
      )
    );

    // 如果 item 有内容，保存到本地
    if (item.content) {
      await window.api.invoke('todo:add-item', cardId, item);
    }
  };

  const localItemDataUpdate = async (cardId: string, itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => {
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

    // 检查是否需要保存到本地
    if (!existingItem.content && updates.content) {
      // 新建的 item，需要调用 add-item
      const newItem = {
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

  const localItemDataDelete = async (cardId: string, itemId: string) => {
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

    // 如果 item 有内容（已保存到本地），需要调用本地删除
    if (existingItem.content) {
      await window.api.invoke('todo:delete-item', cardId, itemId);
    }
  };

  // ==================== 待办项操作 - 在线数据 ====================
  const onlineItemDataAdd = async (cardId: string, item: TodoItem) => {
    const existingCard = cards.find((c) => c.id === cardId);
    if (!existingCard) return;

    // 先更新本地状态
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, items: [item, ...(card.items || [])] } : card
      )
    );

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
  };

  const onlineItemDataUpdate = async (cardId: string, itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => {
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
  };

  const onlineItemDataDelete = async (cardId: string, itemId: string) => {
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

    // 如果 item 有内容（已保存到服务器），需要调用服务器删除
    if (existingItem.content) {
      try {
        await deleteTodoItem(itemId, cardId);
        await loadCards();
      } catch (error) {
        console.error('删除待办项失败:', error);
      }
    }
  };

  // ==================== 主处理方法 ====================
  const handleAddCard = async () => {
    // 获取所有卡片，计算下一个序号
    const nextNumber = cards.length + 1;
    const autoName = `待办事项(${nextNumber})`;
    const now = Date.now();
    const newCardId = `${now}-${Math.random().toString(36).substr(2, 9)}`;

    if (useLocalData) {
      const newCard: TodoCardType = {
        id: newCardId,
        name: autoName,
        items: [],
        starred: false,
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      if (isLogin) {
        // 登录时同时添加本地和在线数据
        await Promise.all([localCardDataAdd(newCard), onlineCardDataAdd(newCardId, autoName)]);
      } else {
        // 未登录时只添加本地数据
        await localCardDataAdd(newCard);
      }
    } else {
      // 在线数据模式，只添加在线数据
      await onlineCardDataAdd(newCardId, autoName);
    }
  };

  const handleUpdateCard = async (cardId: string, updates: Partial<Omit<TodoCardType, 'id'>>) => {
    if (useLocalData) {
      if (isLogin) {
        // 登录时，检查 isOnlineData
        const cardToUpdate = cards.find((c) => c.id === cardId);
        if (cardToUpdate?.isOnlineData === true) {
          // isOnlineData 为 true 时，同时更新本地和在线数据
          await Promise.all([localCardDataUpdate(cardId, updates), onlineCardDataUpdate(cardId, updates)]);
        } else {
          // isOnlineData 为 false 时，只更新本地数据
          await localCardDataUpdate(cardId, updates);
        }
      } else {
        // 未登录时只更新本地数据
        await localCardDataUpdate(cardId, updates);
      }
    } else {
      // 在线数据模式，登录时同时更新本地和在线数据
      if (isLogin) {
        await Promise.all([onlineCardDataUpdate(cardId, updates), localCardDataUpdate(cardId, updates)]);
      } else {
        // 未登录时只更新在线数据
        await onlineCardDataUpdate(cardId, updates);
      }
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    // 查找要删除的卡片，获取名称用于确认提示
    const cardToDelete = cards.find((card) => card.id === cardId);
    const cardName = cardToDelete?.name || '该卡片';

    // 构建确认提示信息
    let confirmMessage = `确定要删除"${cardName}"吗？删除后无法恢复。`;
    if (useLocalData) {
      if (isLogin && cardToDelete?.isOnlineData === true) {
        confirmMessage += '\n\n该卡片已同步到在线数据库，删除时也会删除在线数据。';
      }
    } else {
      if (isLogin) {
        confirmMessage += '\n\n删除时也会删除本地缓存数据。';
      }
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
      if (isLogin) {
        // 登录时，检查 isOnlineData
        if (cardToDelete?.isOnlineData === true) {
          // isOnlineData 为 true 时，同时删除本地和在线数据
          await Promise.all([onlineCardDataDelete(cardId), localCardDataDelete(cardId)]);
        } else {
          // isOnlineData 为 false 时，只删除本地数据
          await localCardDataDelete(cardId);
        }
      } else {
        // 未登录时只删除本地数据
        await localCardDataDelete(cardId);
      }
    } else {
      // 在线数据模式，登录时同时删除本地和在线数据
      if (isLogin) {
        await Promise.all([onlineCardDataDelete(cardId), localCardDataDelete(cardId)]);
      } else {
        // 未登录时只删除在线数据
        await onlineCardDataDelete(cardId);
      }
    }
  };

  const handleAddItem = async (cardId: string, item: TodoItem) => {
    if (useLocalData) {
      if (isLogin) {
        // 登录时，检查卡片的 isOnlineData
        const existingCard = cards.find((c) => c.id === cardId);
        if (existingCard?.isOnlineData === true) {
          // isOnlineData 为 true 时，同时添加本地和在线数据
          await Promise.all([localItemDataAdd(cardId, item), onlineItemDataAdd(cardId, item)]);
        } else {
          // isOnlineData 为 false 时，只添加本地数据
          await localItemDataAdd(cardId, item);
        }
      } else {
        // 未登录时只添加本地数据
        await localItemDataAdd(cardId, item);
      }
    } else {
      // 在线数据模式，登录时同时添加本地和在线数据
      if (isLogin) {
        await Promise.all([onlineItemDataAdd(cardId, item), localItemDataAdd(cardId, item)]);
      } else {
        // 未登录时只添加在线数据
        await onlineItemDataAdd(cardId, item);
      }
    }
  };

  const handleUpdateItem = async (cardId: string, itemId: string, updates: Partial<Omit<TodoItem, 'id'>>) => {
    if (useLocalData) {
      if (isLogin) {
        // 登录时，检查卡片的 isOnlineData
        const existingCard = cards.find((c) => c.id === cardId);
        if (existingCard?.isOnlineData === true) {
          // isOnlineData 为 true 时，同时更新本地和在线数据
          await Promise.all([localItemDataUpdate(cardId, itemId, updates), onlineItemDataUpdate(cardId, itemId, updates)]);
        } else {
          // isOnlineData 为 false 时，只更新本地数据
          await localItemDataUpdate(cardId, itemId, updates);
        }
      } else {
        // 未登录时只更新本地数据
        await localItemDataUpdate(cardId, itemId, updates);
      }
    } else {
      // 在线数据模式，登录时同时更新本地和在线数据
      if (isLogin) {
        await Promise.all([onlineItemDataUpdate(cardId, itemId, updates), localItemDataUpdate(cardId, itemId, updates)]);
      } else {
        // 未登录时只更新在线数据
        await onlineItemDataUpdate(cardId, itemId, updates);
      }
    }
  };

  const handleDeleteItem = async (cardId: string, itemId: string) => {
    if (useLocalData) {
      if (isLogin) {
        // 登录时，检查卡片的 isOnlineData
        const existingCard = cards.find((c) => c.id === cardId);
        if (existingCard?.isOnlineData === true) {
          // isOnlineData 为 true 时，同时删除本地和在线数据
          await Promise.all([onlineItemDataDelete(cardId, itemId), localItemDataDelete(cardId, itemId)]);
        } else {
          // isOnlineData 为 false 时，只删除本地数据
          await localItemDataDelete(cardId, itemId);
        }
      } else {
        // 未登录时只删除本地数据
        await localItemDataDelete(cardId, itemId);
      }
    } else {
      // 在线数据模式，登录时同时删除本地和在线数据
      if (isLogin) {
        await Promise.all([onlineItemDataDelete(cardId, itemId), localItemDataDelete(cardId, itemId)]);
      } else {
        // 未登录时只删除在线数据
        await onlineItemDataDelete(cardId, itemId);
      }
    }
  };

  // ==================== 排序逻辑 ====================
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (sortByStar) {
        // 标星优先
        if (a.starred !== b.starred) {
          return a.starred ? -1 : 1;
        }
      }
      // 按创建时间倒序
      return (b.created_at || 0) - (a.created_at || 0);
    });
  }, [cards, sortByStar]);

  return {
    cards,
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
  };
}
