import { Settings2 } from 'lucide-react';

import { Page, PageHeader, SectionCard } from '../../../shared/ui/Page';
import { SearchInput, SegmentedControl } from '../../../shared/ui/Controls';
import { RecordList } from '../components/RecordList';
import { SummaryCards } from '../components/SummaryCards';
import { QuickAddForm } from '../components/QuickAddForm';
import { recentMonthOptions } from '../lib/bookkeeping';
import type { BookkeepingViewProps } from '../viewTypes';

export function BookkeepingDesktop(props: BookkeepingViewProps) {
  const monthOptions = recentMonthOptions(18);
  if (!monthOptions.some((option) => option.value === props.month)) {
    monthOptions.unshift({ value: props.month, label: props.monthLabel });
  }

  return (
    <Page>
      <PageHeader
        title="记账"
        description="按用途记录每一笔，支持多人共同维护。"
        actions={
          <button type="button" className="btn-secondary" onClick={props.onOpenPurposeManager}>
            <Settings2 className="h-4 w-4" />
            管理用途
          </button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <SummaryCards totals={props.totals} monthLabel={props.monthLabel} />

          <SectionCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedControl
                value={props.filterType}
                onChange={props.onFilterTypeChange}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'expense', label: '支出' },
                  { value: 'income', label: '收入' },
                ]}
              />
              <select
                className="field w-auto py-2"
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

            <div className="mt-3">
              <SearchInput
                value={props.keyword}
                onChange={props.onKeywordChange}
                placeholder="搜索用途、备注、金额或日期"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`chip ${props.purposeFilter === '全部' ? 'chip-active' : ''}`}
                onClick={() => props.onPurposeFilterChange('全部')}
              >
                全部用途
              </button>
              {props.purposes.map((purpose) => (
                <button
                  key={purpose.id}
                  type="button"
                  className={`chip ${props.purposeFilter === purpose.name ? 'chip-active' : ''}`}
                  onClick={() => props.onPurposeFilterChange(purpose.name)}
                >
                  {purpose.name}
                </button>
              ))}
            </div>
          </SectionCard>

          <RecordList
            records={props.records}
            currentUserId={props.currentUserId}
            onDelete={props.onDelete}
            onViewAttachments={props.onViewAttachments}
            emptyTitle={props.keyword ? '没有匹配的记录' : '这个月还没有记录'}
            emptyDescription={props.keyword ? '换一个关键词试试。' : '在右侧记下第一笔。'}
          />
        </div>

        <aside className="lg:sticky lg:top-4">
          <SectionCard title="记一笔" description="金额、用途必填，备注与附件可选">
            <QuickAddForm
              compact
              purposes={props.purposes}
              defaultPurpose={props.defaultPurpose}
              submitting={props.submitting}
              onCreatePurpose={props.onCreatePurpose}
              onAdd={props.onAdd}
            />
          </SectionCard>
        </aside>
      </div>
    </Page>
  );
}
