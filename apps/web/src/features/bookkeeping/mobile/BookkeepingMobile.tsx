import { Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { Page } from '../../../shared/ui/Page';
import { SearchInput, SegmentedControl } from '../../../shared/ui/Controls';
import { BottomSheet } from '../../../shared/ui/Overlay';
import { RecordList } from '../components/RecordList';
import { SummaryCards } from '../components/SummaryCards';
import { QuickAddForm } from '../components/QuickAddForm';
import { recentMonthOptions } from '../lib/bookkeeping';
import type { BookkeepingViewProps } from '../viewTypes';

export function BookkeepingMobile(props: BookkeepingViewProps) {
  const [addOpen, setAddOpen] = useState(false);
  const monthOptions = recentMonthOptions(12);
  if (!monthOptions.some((option) => option.value === props.month)) {
    monthOptions.unshift({ value: props.month, label: props.monthLabel });
  }

  return (
    <Page className="pb-32 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">记账</h1>
          <p className="mt-0.5 text-xs text-subtle">{props.monthLabel} · 支持多人共同维护</p>
        </div>
        <button
          type="button"
          className="btn-ghost h-9 w-9 p-0"
          onClick={props.onOpenPurposeManager}
          aria-label="管理用途"
        >
          <Settings2 className="h-4.5 w-4.5" />
        </button>
      </header>

      <SummaryCards totals={props.totals} monthLabel={props.monthLabel} compact />

      <div className="card mt-3 space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <SegmentedControl
            size="sm"
            value={props.filterType}
            onChange={props.onFilterTypeChange}
            options={[
              { value: 'all', label: '全部' },
              { value: 'expense', label: '支出' },
              { value: 'income', label: '收入' },
            ]}
          />
          <select
            className="field w-auto py-1.5 text-xs"
            value={props.month}
            onChange={(event) => props.onMonthChange(event.target.value)}
            aria-label="选择月份"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <SearchInput
          value={props.keyword}
          onChange={props.onKeywordChange}
          placeholder="搜索用途、备注、金额"
        />
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          <button
            type="button"
            className={`chip flex-shrink-0 ${props.purposeFilter === '全部' ? 'chip-active' : ''}`}
            onClick={() => props.onPurposeFilterChange('全部')}
          >
            全部用途
          </button>
          {props.purposes.map((purpose) => (
            <button
              key={purpose.id}
              type="button"
              className={`chip flex-shrink-0 ${props.purposeFilter === purpose.name ? 'chip-active' : ''}`}
              onClick={() => props.onPurposeFilterChange(purpose.name)}
            >
              {purpose.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <RecordList
          compact
          records={props.records}
          currentUserId={props.currentUserId}
          onDelete={props.onDelete}
          onViewAttachments={props.onViewAttachments}
          emptyTitle={props.keyword ? '没有匹配的记录' : '这个月还没有记录'}
          emptyDescription={props.keyword ? '换一个关键词试试。' : '点右下角的 + 记下第一笔。'}
        />
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-pop transition active:scale-95"
        aria-label="记一笔"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="记一笔"
        description="金额、用途必填，备注与附件可选"
      >
        <QuickAddForm
          compact
          purposes={props.purposes}
          defaultPurpose={props.defaultPurpose}
          submitting={props.submitting}
          onCreatePurpose={props.onCreatePurpose}
          onAdd={async (input) => {
            const created = await props.onAdd(input);
            if (created) setAddOpen(false);
            return created;
          }}
        />
      </BottomSheet>
    </Page>
  );
}
