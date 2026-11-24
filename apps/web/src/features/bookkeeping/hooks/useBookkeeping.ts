import type { BookkeepingPurpose, BookkeepingRecord, BookkeepingType } from '@xtool/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { errorMessage } from '../../../shared/lib/http';
import { confirm, toast } from '../../../shared/store/feedback';
import * as api from '../api';

export interface AddRecordInput {
  purpose: string;
  description?: string;
  amount: number;
  type: BookkeepingType;
  files?: File[];
}

export function useBookkeeping() {
  const [records, setRecords] = useState<BookkeepingRecord[]>([]);
  const [purposes, setPurposes] = useState<BookkeepingPurpose[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [recordResult, purposeResult] = await Promise.all([
        api.fetchRecords(),
        api.fetchPurposes(),
      ]);
      if (!recordResult.success) throw new Error(recordResult.error || '获取记录失败');
      if (!purposeResult.success) throw new Error(purposeResult.error || '获取用途失败');
      setRecords(recordResult.records ?? []);
      setPurposes(purposeResult.purposes ?? []);
    } catch (error) {
      toast(errorMessage(error, '加载记账数据失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshRecords = useCallback(async () => {
    try {
      const result = await api.fetchRecords();
      if (result.success) setRecords(result.records ?? []);
    } catch (error) {
      toast(errorMessage(error, '刷新记录失败'), 'error');
    }
  }, []);

  const refreshPurposes = useCallback(async () => {
    try {
      const result = await api.fetchPurposes();
      if (result.success) setPurposes(result.purposes ?? []);
    } catch (error) {
      toast(errorMessage(error, '刷新用途失败'), 'error');
    }
  }, []);

  const addRecord = useCallback(
    async (input: AddRecordInput): Promise<boolean> => {
      if (!input.purpose.trim()) {
        toast('请选择用途', 'error');
        return false;
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        toast('请输入有效金额', 'error');
        return false;
      }

      setSubmitting(true);
      try {
        const { files, ...payload } = input;
        const result = await api.createRecord({ ...payload, purpose: input.purpose.trim() });
        if (!result.success) throw new Error(result.error || '添加失败');

        if (files?.length && result.id) {
          try {
            await api.uploadAttachments(result.id, files);
          } catch (error) {
            toast(`记录已保存，但附件上传失败：${errorMessage(error)}`, 'error');
          }
        }

        toast('已记一笔', 'success');
        await refreshRecords();
        return true;
      } catch (error) {
        toast(errorMessage(error, '添加失败'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [refreshRecords],
  );

  const removeRecord = useCallback(async (record: BookkeepingRecord) => {
    const confirmed = await confirm({
      title: '删除记录',
      message: `确定删除「${record.purpose} ¥${record.amount.toFixed(2)}」吗？`,
      confirmText: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const result = await api.deleteRecord(record.id);
      if (!result.success) throw new Error(result.error || '删除失败');
      setRecords((current) => current.filter((item) => item.id !== record.id));
      toast('已删除', 'success');
    } catch (error) {
      toast(errorMessage(error, '删除失败'), 'error');
    }
  }, []);

  const addPurpose = useCallback(
    async (name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      try {
        const result = await api.createPurpose(trimmed);
        if (!result.success) throw new Error(result.error || '添加失败');
        await refreshPurposes();
        toast('用途已添加', 'success');
        return true;
      } catch (error) {
        toast(errorMessage(error, '添加用途失败'), 'error');
        return false;
      }
    },
    [refreshPurposes],
  );

  const renamePurpose = useCallback(
    async (purpose: BookkeepingPurpose, name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === purpose.name) return false;
      try {
        const result = await api.updatePurpose(purpose.id, trimmed);
        if (!result.success) throw new Error(result.error || '更新失败');
        await Promise.all([refreshPurposes(), refreshRecords()]);
        toast('用途已更新', 'success');
        return true;
      } catch (error) {
        toast(errorMessage(error, '更新用途失败'), 'error');
        return false;
      }
    },
    [refreshPurposes, refreshRecords],
  );

  const removePurpose = useCallback(
    async (purpose: BookkeepingPurpose): Promise<boolean> => {
      const confirmed = await confirm({
        title: '删除用途',
        message: `删除「${purpose.name}」只影响标签列表，已有记录不会改变。`,
        confirmText: '删除',
        variant: 'danger',
      });
      if (!confirmed) return false;
      try {
        const result = await api.deletePurpose(purpose.id);
        if (!result.success) throw new Error(result.error || '删除失败');
        await refreshPurposes();
        toast('用途已删除', 'success');
        return true;
      } catch (error) {
        toast(errorMessage(error, '删除用途失败'), 'error');
        return false;
      }
    },
    [refreshPurposes],
  );

  const makePurposeDefault = useCallback(
    async (purpose: BookkeepingPurpose): Promise<boolean> => {
      try {
        const result = await api.setDefaultPurpose(purpose.id);
        if (!result.success) throw new Error(result.error || '设置失败');
        await refreshPurposes();
        toast('已设为默认用途', 'success');
        return true;
      } catch (error) {
        toast(errorMessage(error, '设置默认用途失败'), 'error');
        return false;
      }
    },
    [refreshPurposes],
  );

  const defaultPurpose = useMemo(() => purposes.find((item) => item.is_default === 1), [purposes]);

  return {
    records,
    purposes,
    defaultPurpose,
    loading,
    submitting,
    reload: load,
    refreshRecords,
    refreshPurposes,
    addRecord,
    removeRecord,
    addPurpose,
    renamePurpose,
    removePurpose,
    makePurposeDefault,
  };
}
