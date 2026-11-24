import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';

import { formatCurrency } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/cn';
import type { BookkeepingTotals } from '../lib/bookkeeping';

export function SummaryCards({
  totals,
  monthLabel,
  compact = false,
}: {
  totals: BookkeepingTotals;
  monthLabel?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-subtle">{monthLabel ?? '本月'}结余</p>
          <span className="text-xs text-subtle">收入 - 支出</span>
        </div>
        <p
          className={cn(
            'text-3xl font-semibold tracking-tight',
            totals.balance >= 0 ? 'text-fg' : 'text-danger',
          )}
        >
          ¥{formatCurrency(totals.balance)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-sm">
          <div>
            <p className="text-xs text-subtle">支出</p>
            <p className="mt-0.5 font-medium text-danger">¥{formatCurrency(totals.expense)}</p>
          </div>
          <div>
            <p className="text-xs text-subtle">收入</p>
            <p className="mt-0.5 font-medium text-success">¥{formatCurrency(totals.income)}</p>
          </div>
        </div>
      </div>
    );
  }

  const items = [
    {
      label: '支出',
      value: totals.expense,
      icon: TrendingDown,
      className: 'text-danger',
      iconClassName: 'bg-danger-soft text-danger',
    },
    {
      label: '收入',
      value: totals.income,
      icon: TrendingUp,
      className: 'text-success',
      iconClassName: 'bg-success-soft text-success',
    },
    {
      label: '结余',
      value: totals.balance,
      icon: Wallet,
      className: totals.balance >= 0 ? 'text-fg' : 'text-danger',
      iconClassName: 'bg-accent-soft text-accent',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="card p-3 xl:p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-subtle xl:text-xs">{item.label}</p>
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg',
                  item.iconClassName,
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p
              className={cn('mt-2 text-lg font-semibold tracking-tight xl:text-xl', item.className)}
            >
              ¥{formatCurrency(item.value)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
