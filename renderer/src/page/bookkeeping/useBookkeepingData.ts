import { useState, useEffect, useCallback } from 'react';
import {
  getBookkeepingRecords,
  createBookkeepingRecord,
  updateBookkeepingRecord,
  deleteBookkeepingRecord,
  getBookkeepingPurposes,
  createBookkeepingPurpose,
  updateBookkeepingPurpose,
  deleteBookkeepingPurpose,
  setDefaultBookkeepingPurpose,
  type BookkeepingRecord,
  type BookkeepingPurposeItem,
} from '../../api/bookkeeping';
import { showToast } from '../../components/toast/Toast';
import { confirm } from '../../components/confirm';

export function useBookkeepingData() {
  const [records, setRecords] = useState<BookkeepingRecord[]>([]);
  const [purposes, setPurposes] = useState<BookkeepingPurposeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBookkeepingRecords();
      if (res.success && res.records) {
        setRecords(res.records);
      }
    } catch (error) {
      console.error('获取记账记录失败:', error);
      showToast('获取记录失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPurposes = useCallback(async () => {
    try {
      const res = await getBookkeepingPurposes();
      if (res.success && res.purposes) {
        setPurposes(res.purposes);
      }
    } catch (error) {
      console.error('获取用途列表失败:', error);
      showToast('获取用途失败');
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchPurposes();
  }, [fetchPurposes]);

  const handleAdd = useCallback(
    async (record: {
      purpose: string;
      description?: string;
      amount: number;
      type: 'expense' | 'income';
    }) => {
      try {
        const res = await createBookkeepingRecord(record);
        if (res.success) {
          showToast('添加成功');
          fetchRecords();
        } else {
          showToast(res.error || '添加失败');
        }
      } catch (error) {
        console.error('添加失败:', error);
        showToast('添加失败');
      }
    },
    [fetchRecords]
  );

  const handleUpdate = useCallback(
    async (
      id: number,
      updates: {
        purpose?: string;
        description?: string;
        amount?: number;
        type?: 'expense' | 'income';
      }
    ) => {
      try {
        const res = await updateBookkeepingRecord(id, updates);
        if (res.success) {
          showToast('更新成功');
          fetchRecords();
        } else {
          showToast(res.error || '更新失败');
        }
      } catch (error) {
        console.error('更新失败:', error);
        showToast('更新失败');
      }
    },
    [fetchRecords]
  );

  const handleDelete = useCallback(
    async (record: BookkeepingRecord) => {
      const ok = await confirm({
        title: '确认删除',
        message: `确定要删除「${record.purpose} ${record.amount}元」这笔记录吗？`,
        confirmText: '删除',
        cancelText: '取消',
      });
      if (!ok) return;
      try {
        const res = await deleteBookkeepingRecord(record.id);
        if (res.success) {
          showToast('已删除');
          fetchRecords();
        } else {
          showToast(res.error || '删除失败');
        }
      } catch (error) {
        console.error('删除失败:', error);
        showToast('删除失败');
      }
    },
    [fetchRecords]
  );

  const handleCreatePurpose = useCallback(
    async (name: string) => {
      try {
        const res = await createBookkeepingPurpose(name.trim());
        if (res.success) {
          showToast('添加成功');
          fetchPurposes();
        } else {
          showToast(res.error || '添加失败');
        }
      } catch (error) {
        console.error('添加用途失败:', error);
        showToast('添加失败');
      }
    },
    [fetchPurposes]
  );

  const handleUpdatePurpose = useCallback(
    async (id: number, name: string) => {
      try {
        const res = await updateBookkeepingPurpose(id, name.trim());
        if (res.success) {
          showToast('更新成功');
          fetchPurposes();
        } else {
          showToast(res.error || '更新失败');
        }
      } catch (error) {
        console.error('更新用途失败:', error);
        showToast('更新失败');
      }
    },
    [fetchPurposes]
  );

  const handleDeletePurpose = useCallback(
    async (item: BookkeepingPurposeItem) => {
      const ok = await confirm({
        title: '确认删除用途',
        message: `确定要删除用途「${item.name}」吗？删除后仅影响标签列表，已有记账记录不会改变。`,
        confirmText: '删除',
        cancelText: '取消',
      });
      if (!ok) return;
      try {
        const res = await deleteBookkeepingPurpose(item.id);
        if (res.success) {
          showToast('已删除');
          fetchPurposes();
        } else {
          showToast(res.error || '删除失败');
        }
      } catch (error) {
        console.error('删除用途失败:', error);
        showToast('删除失败');
      }
    },
    [fetchPurposes]
  );

  const handleSetDefaultPurpose = useCallback(
    async (id: number) => {
      try {
        const res = await setDefaultBookkeepingPurpose(id);
        if (res.success) {
          showToast('已设为默认');
          fetchPurposes();
        } else {
          showToast(res.error || '操作失败');
        }
      } catch (error) {
        console.error('设为默认失败:', error);
        showToast('操作失败');
      }
    },
    [fetchPurposes]
  );

  return {
    records,
    purposes,
    loading,
    fetchRecords,
    fetchPurposes,
    handleAdd,
    handleUpdate,
    handleDelete,
    handleCreatePurpose,
    handleUpdatePurpose,
    handleDeletePurpose,
    handleSetDefaultPurpose,
  };
}
