import type { BookkeepingRecord, BookkeepingType } from '@xtool/shared';

export interface BookkeepingTotals {
  expense: number;
  income: number;
  balance: number;
}

export interface RecordGroup {
  date: string;
  records: BookkeepingRecord[];
  expense: number;
  income: number;
  total: number;
}

/** record_date 可能是 YYYY-MM-DD，也可能是完整 ISO 字符串 */
export function monthOf(value: string): string {
  return value.slice(0, 7);
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [yearPart, monthPart] = monthKey.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  const shifted = new Date(year, month - 1 + delta, 1);
  return currentMonthKey(shifted);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

/** 生成最近 n 个月的选项，用于桌面端月份筛选 */
export function recentMonthOptions(
  count = 12,
  base = new Date(),
): Array<{ value: string; label: string }> {
  return Array.from({ length: count }, (_, index) => {
    const key = shiftMonth(currentMonthKey(base), -index);
    return { value: key, label: formatMonthLabel(key) };
  });
}

export function filterByMonth(records: BookkeepingRecord[], monthKey: string): BookkeepingRecord[] {
  if (!monthKey) return records;
  return records.filter((record) => monthOf(record.record_date) === monthKey);
}

export function filterByType(
  records: BookkeepingRecord[],
  type: BookkeepingType | 'all',
): BookkeepingRecord[] {
  return type === 'all' ? records : records.filter((record) => record.type === type);
}

export function filterByPurpose(
  records: BookkeepingRecord[],
  purpose: string,
): BookkeepingRecord[] {
  return purpose === '全部' ? records : records.filter((record) => record.purpose === purpose);
}

/** 备注/用途/金额/日期都能搜，优先命中备注和用途 */
export function searchRecords(records: BookkeepingRecord[], keyword: string): BookkeepingRecord[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return records;

  return records
    .map((record) => {
      const description = (record.description || '').toLowerCase();
      const purpose = (record.purpose || '').toLowerCase();
      const amount = String(record.amount);
      const date = `${record.record_date} ${record.created_at}`.toLowerCase();
      let score = 0;
      if (purpose.includes(normalized)) score = 4;
      else if (description.includes(normalized)) score = 3;
      else if (date.includes(normalized)) score = 2;
      else if (amount.includes(normalized) || Number(record.amount).toFixed(2).includes(normalized))
        score = 1;
      return { record, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.record);
}

export function sortRecordsDesc(records: BookkeepingRecord[]): BookkeepingRecord[] {
  return [...records].sort((left, right) => {
    const dateCompare = right.record_date.localeCompare(left.record_date);
    if (dateCompare !== 0) return dateCompare;
    return right.id - left.id;
  });
}

export function computeTotals(records: BookkeepingRecord[]): BookkeepingTotals {
  return records.reduce<BookkeepingTotals>(
    (totals, record) => {
      if (record.type === 'income') totals.income += Number(record.amount);
      else totals.expense += Number(record.amount);
      totals.balance = totals.income - totals.expense;
      return totals;
    },
    { expense: 0, income: 0, balance: 0 },
  );
}

export function groupRecordsByDate(records: BookkeepingRecord[]): RecordGroup[] {
  const grouped = new Map<string, BookkeepingRecord[]>();
  for (const record of sortRecordsDesc(records)) {
    const list = grouped.get(record.record_date) ?? [];
    list.push(record);
    grouped.set(record.record_date, list);
  }

  return [...grouped.entries()].map(([date, items]) => {
    const totals = computeTotals(items);
    return {
      date,
      records: items,
      expense: totals.expense,
      income: totals.income,
      total: totals.balance,
    };
  });
}

/** 记录日期按本地时区展示，避免直接 new Date('YYYY-MM-DD') 产生时区偏移 */
export function formatRecordDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parsed.getDay()];
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日 ${weekday}`;
}

/** 只保留数字和一个小数点，最多两位小数 */
export function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [integerPart = '', ...rest] = cleaned.split('.');
  if (rest.length === 0) return integerPart;
  return `${integerPart}.${rest.join('').slice(0, 2)}`;
}
