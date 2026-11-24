import { describe, expect, it } from 'vitest';

import type { BookkeepingRecord } from '@xtool/shared';

import { formatCurrency } from '../../../shared/lib/format';
import {
  computeTotals,
  filterByMonth,
  filterByPurpose,
  filterByType,
  formatMonthLabel,
  formatRecordDate,
  groupRecordsByDate,
  recentMonthOptions,
  sanitizeAmountInput,
  searchRecords,
  shiftMonth,
} from './bookkeeping';

function record(
  partial: Partial<BookkeepingRecord> &
    Pick<BookkeepingRecord, 'id' | 'amount' | 'type' | 'record_date'>,
): BookkeepingRecord {
  return {
    user_id: 1,
    purpose: '餐饮',
    description: '',
    created_at: `${partial.record_date}T10:00:00.000Z`,
    updated_at: `${partial.record_date}T10:00:00.000Z`,
    ...partial,
  };
}

const records: BookkeepingRecord[] = [
  record({
    id: 1,
    amount: 30,
    type: 'expense',
    record_date: '2026-11-24',
    purpose: '餐饮',
    description: '午饭',
  }),
  record({ id: 2, amount: 200, type: 'income', record_date: '2026-11-24', purpose: '工资' }),
  record({ id: 3, amount: 12.5, type: 'expense', record_date: '2026-11-23', purpose: '交通' }),
  record({
    id: 4,
    amount: 99,
    type: 'expense',
    record_date: '2026-10-30',
    purpose: '餐饮',
    description: '聚餐',
  }),
];

describe('bookkeeping selectors', () => {
  it('按月份过滤记录', () => {
    expect(filterByMonth(records, '2026-11')).toHaveLength(3);
    expect(filterByMonth(records, '2026-10')).toHaveLength(1);
  });

  it('汇总收入、支出与结余', () => {
    expect(computeTotals(records)).toEqual({ expense: 141.5, income: 200, balance: 58.5 });
  });

  it('按日期倒序分组并计算每组合计', () => {
    const groups = groupRecordsByDate(records);
    expect(groups.map((group) => group.date)).toEqual(['2026-11-24', '2026-11-23', '2026-10-30']);
    expect(groups[0]?.records.map((item) => item.id)).toEqual([2, 1]);
    expect(groups[0]?.income).toBe(200);
    expect(groups[0]?.expense).toBe(30);
    expect(groups[0]?.total).toBe(170);
  });

  it('搜索备注、用途与金额，并优先返回用途命中项', () => {
    expect(searchRecords(records, '聚餐').map((item) => item.id)).toEqual([4]);
    expect(searchRecords(records, '餐饮').map((item) => item.id)).toEqual([1, 4]);
    expect(searchRecords(records, '200').map((item) => item.id)).toEqual([2]);
  });

  it('月份加减跨越年份', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('金额输入只保留两位小数', () => {
    expect(sanitizeAmountInput('12a.3b45')).toBe('12.34');
    expect(sanitizeAmountInput('12.3.4')).toBe('12.34');
    expect(sanitizeAmountInput('abc')).toBe('');
  });

  it('日期展示不会因时区偏移少一天', () => {
    expect(formatRecordDate('2026-11-24')).toContain('11月24日');
  });

  it('按类型和用途筛选', () => {
    expect(filterByType(records, 'expense').map((item) => item.id)).toEqual([1, 3, 4]);
    expect(filterByType(records, 'all')).toHaveLength(4);
    expect(filterByPurpose(records, '餐饮').map((item) => item.id)).toEqual([1, 4]);
    expect(filterByPurpose(records, '全部')).toHaveLength(4);
  });

  it('月份选项倒序生成并带可读标签', () => {
    const options = recentMonthOptions(3, new Date('2026-11-24T10:00:00+08:00'));
    expect(options.map((item) => item.value)).toEqual(['2026-11', '2026-10', '2026-09']);
    expect(formatMonthLabel('2026-01')).toBe('2026年1月');
  });

  it('金额按千分位与两位小数展示', () => {
    expect(formatCurrency(1234.5)).toBe('1,234.50');
    expect(formatCurrency(0)).toBe('0.00');
  });
});
