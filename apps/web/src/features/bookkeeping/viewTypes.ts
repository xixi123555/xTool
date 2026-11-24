import type { BookkeepingPurpose, BookkeepingRecord } from '@xtool/shared';

import type { AddRecordInput } from './hooks/useBookkeeping';
import type { BookkeepingTotals } from './lib/bookkeeping';

export type RecordFilterType = 'all' | 'expense' | 'income';

export interface BookkeepingViewProps {
  records: BookkeepingRecord[];
  totals: BookkeepingTotals;
  purposes: BookkeepingPurpose[];
  defaultPurpose?: BookkeepingPurpose;
  month: string;
  monthLabel: string;
  filterType: RecordFilterType;
  purposeFilter: string;
  keyword: string;
  currentUserId?: number;
  submitting: boolean;
  onFilterTypeChange: (value: RecordFilterType) => void;
  onPurposeFilterChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onAdd: (input: AddRecordInput) => Promise<boolean>;
  onCreatePurpose: (name: string) => Promise<boolean>;
  onOpenPurposeManager: () => void;
  onDelete: (record: BookkeepingRecord) => void;
  onViewAttachments: (record: BookkeepingRecord) => void;
}
