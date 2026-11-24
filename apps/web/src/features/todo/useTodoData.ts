import type { TodoCard, TodoItem } from '@xtool/shared';
import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '../../shared/lib/http';
import { createId } from '../../shared/lib/id';
import { confirm, toast } from '../../shared/store/feedback';
import * as api from './api';

export function useTodoData() {
  const [cards, setCards] = useState<TodoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.fetchTodoCards();
      if (!result.success) throw new Error(result.error || '加载待办失败');
      setCards(result.cards ?? []);
    } catch (error) {
      toast(errorMessage(error, '加载待办失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addCard = useCallback(
    async (input: { name: string; tags: string[] }) => {
      setSaving(true);
      try {
        const result = await api.createTodoCard({
          id: createId('card'),
          name: input.name.trim(),
          tags: input.tags,
        });
        if (!result.success) throw new Error(result.error || '创建失败');
        toast('卡片已创建', 'success');
        await load();
        return true;
      } catch (error) {
        toast(errorMessage(error, '创建失败'), 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const toggleStar = useCallback(async (card: TodoCard) => {
    setCards((current) =>
      current.map((item) => (item.id === card.id ? { ...item, starred: !item.starred } : item)),
    );
    try {
      await api.updateTodoCard(card.id, { starred: !card.starred });
    } catch (error) {
      setCards((current) =>
        current.map((item) => (item.id === card.id ? { ...item, starred: card.starred } : item)),
      );
      toast(errorMessage(error, '更新失败'), 'error');
    }
  }, []);

  const renameCard = useCallback(async (card: TodoCard, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === card.name) return false;
    try {
      const result = await api.updateTodoCard(card.id, { name: trimmed });
      if (!result.success) throw new Error(result.error || '更新失败');
      setCards((current) =>
        current.map((item) => (item.id === card.id ? { ...item, name: trimmed } : item)),
      );
      return true;
    } catch (error) {
      toast(errorMessage(error, '更新失败'), 'error');
      return false;
    }
  }, []);

  const removeCard = useCallback(async (card: TodoCard) => {
    const confirmed = await confirm({
      title: '删除卡片',
      message: `确定删除「${card.name}」及其中所有待办项吗？`,
      confirmText: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const result = await api.deleteTodoCard(card.id);
      if (!result.success) throw new Error(result.error || '删除失败');
      setCards((current) => current.filter((item) => item.id !== card.id));
      toast('卡片已删除', 'success');
    } catch (error) {
      toast(errorMessage(error, '删除失败'), 'error');
    }
  }, []);

  const addItem = useCallback(async (card: TodoCard, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    const optimistic: TodoItem = {
      id: createId('item'),
      card_id: card.id,
      content: trimmed,
      completed: false,
      deleted: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setCards((current) =>
      current.map((item) =>
        item.id === card.id ? { ...item, items: [...(item.items ?? []), optimistic] } : item,
      ),
    );
    try {
      const result = await api.createTodoItem(optimistic);
      if (!result.success) throw new Error(result.error || '添加失败');
      return true;
    } catch (error) {
      setCards((current) =>
        current.map((item) =>
          item.id === card.id
            ? { ...item, items: (item.items ?? []).filter((todo) => todo.id !== optimistic.id) }
            : item,
        ),
      );
      toast(errorMessage(error, '添加待办失败'), 'error');
      return false;
    }
  }, []);

  const toggleItem = useCallback(async (card: TodoCard, item: TodoItem) => {
    setCards((current) =>
      current.map((entry) =>
        entry.id === card.id
          ? {
              ...entry,
              items: (entry.items ?? []).map((todo) =>
                todo.id === item.id ? { ...todo, completed: !todo.completed } : todo,
              ),
            }
          : entry,
      ),
    );
    try {
      const result = await api.updateTodoItem(item.id, card.id, { completed: !item.completed });
      if (!result.success) throw new Error(result.error || '更新失败');
    } catch (error) {
      setCards((current) =>
        current.map((entry) =>
          entry.id === card.id
            ? {
                ...entry,
                items: (entry.items ?? []).map((todo) =>
                  todo.id === item.id ? { ...todo, completed: item.completed } : todo,
                ),
              }
            : entry,
        ),
      );
      toast(errorMessage(error, '更新待办失败'), 'error');
    }
  }, []);

  const removeItem = useCallback(async (card: TodoCard, item: TodoItem) => {
    setCards((current) =>
      current.map((entry) =>
        entry.id === card.id
          ? { ...entry, items: (entry.items ?? []).filter((todo) => todo.id !== item.id) }
          : entry,
      ),
    );
    try {
      const result = await api.deleteTodoItem(item.id, card.id);
      if (!result.success) throw new Error(result.error || '删除失败');
    } catch (error) {
      setCards((current) =>
        current.map((entry) =>
          entry.id === card.id ? { ...entry, items: [...(entry.items ?? []), item] } : entry,
        ),
      );
      toast(errorMessage(error, '删除待办失败'), 'error');
    }
  }, []);

  return {
    cards,
    loading,
    saving,
    addCard,
    toggleStar,
    renameCard,
    removeCard,
    addItem,
    toggleItem,
    removeItem,
  };
}
