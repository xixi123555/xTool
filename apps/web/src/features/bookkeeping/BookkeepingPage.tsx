import type { BookkeepingRecord } from '@xtool/shared';
import { useEffect, useMemo, useState } from 'react';

import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { useAuthStore } from '../../shared/store/auth';
import { Page, Spinner } from '../../shared/ui/Page';
import { AttachmentViewer } from './components/AttachmentViewer';
import { PurposeManager } from './components/PurposeManager';
import { BookkeepingDesktop } from './desktop/BookkeepingDesktop';
import { useBookkeeping } from './hooks/useBookkeeping';
import { BookkeepingMobile } from './mobile/BookkeepingMobile';
import {
  computeTotals,
  currentMonthKey,
  filterByMonth,
  filterByPurpose,
  filterByType,
  formatMonthLabel,
  searchRecords,
} from './lib/bookkeeping';
import type { RecordFilterType } from './viewTypes';

export function BookkeepingPage() {
  const isMobile = useIsMobile();
  const userId = useAuthStore((state) => state.user?.id);
  const bookkeeping = useBookkeeping();

  const [month, setMonth] = useState(currentMonthKey());
  const [filterType, setFilterType] = useState<RecordFilterType>('all');
  const [purposeFilter, setPurposeFilter] = useState('全部');
  const [keyword, setKeyword] = useState('');
  const [purposeManagerOpen, setPurposeManagerOpen] = useState(false);
  const [attachmentRecord, setAttachmentRecord] = useState<BookkeepingRecord | null>(null);

  useEffect(() => {
    if (
      purposeFilter !== '全部' &&
      !bookkeeping.purposes.some((item) => item.name === purposeFilter)
    ) {
      setPurposeFilter('全部');
    }
  }, [bookkeeping.purposes, purposeFilter]);

  const monthRecords = useMemo(
    () => filterByMonth(bookkeeping.records, month),
    [bookkeeping.records, month],
  );

  const records = useMemo(() => {
    const byType = filterByType(monthRecords, filterType);
    const byPurpose = filterByPurpose(byType, purposeFilter);
    return searchRecords(byPurpose, keyword);
  }, [monthRecords, filterType, purposeFilter, keyword]);

  const totals = useMemo(() => computeTotals(monthRecords), [monthRecords]);

  if (bookkeeping.loading) {
    return (
      <Page>
        <Spinner />
      </Page>
    );
  }

  const viewProps = {
    records,
    totals,
    purposes: bookkeeping.purposes,
    defaultPurpose: bookkeeping.defaultPurpose,
    month,
    monthLabel: formatMonthLabel(month),
    filterType,
    purposeFilter,
    keyword,
    currentUserId: userId,
    submitting: bookkeeping.submitting,
    onFilterTypeChange: setFilterType,
    onPurposeFilterChange: setPurposeFilter,
    onMonthChange: setMonth,
    onKeywordChange: setKeyword,
    onCreatePurpose: bookkeeping.addPurpose,
    onOpenPurposeManager: () => setPurposeManagerOpen(true),
    onDelete: (record: BookkeepingRecord) => void bookkeeping.removeRecord(record),
    onViewAttachments: (record: BookkeepingRecord) => setAttachmentRecord(record),
    onAdd: async (input: Parameters<typeof bookkeeping.addRecord>[0]) => {
      const created = await bookkeeping.addRecord(input);
      if (created) setMonth(currentMonthKey());
      return created;
    },
  };

  return (
    <>
      {isMobile ? <BookkeepingMobile {...viewProps} /> : <BookkeepingDesktop {...viewProps} />}

      <PurposeManager
        open={purposeManagerOpen}
        mobile={isMobile}
        purposes={bookkeeping.purposes}
        onClose={() => setPurposeManagerOpen(false)}
        onAdd={bookkeeping.addPurpose}
        onRename={bookkeeping.renamePurpose}
        onRemove={bookkeeping.removePurpose}
        onSetDefault={bookkeeping.makePurposeDefault}
      />

      <AttachmentViewer
        open={Boolean(attachmentRecord)}
        mobile={isMobile}
        record={attachmentRecord}
        currentUserId={userId}
        onClose={() => setAttachmentRecord(null)}
        onChanged={() => void bookkeeping.refreshRecords()}
      />
    </>
  );
}
