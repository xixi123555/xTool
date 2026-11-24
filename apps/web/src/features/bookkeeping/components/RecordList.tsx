import type { BookkeepingRecord } from '@xtool/shared';
import { Image, Paperclip, Trash2 } from 'lucide-react';

import { cn } from '../../../shared/lib/cn';
import { formatCurrency, formatDateTime } from '../../../shared/lib/format';
import { EmptyState } from '../../../shared/ui/Page';
import { formatRecordDate, groupRecordsByDate } from '../lib/bookkeeping';

interface RecordListProps {
  records: BookkeepingRecord[];
  currentUserId?: number;
  onDelete: (record: BookkeepingRecord) => void;
  onViewAttachments: (record: BookkeepingRecord) => void;
  compact?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function RecordList({
  records,
  currentUserId,
  onDelete,
  onViewAttachments,
  compact = false,
  emptyTitle = '还没有记录',
  emptyDescription = '在右侧或下方记下第一笔。',
}: RecordListProps) {
  if (records.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const groups = groupRecordsByDate(records);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.date}>
          <div className="mb-2 flex items-center justify-between px-0.5">
            <p className="text-xs font-medium text-subtle">{formatRecordDate(group.date)}</p>
            <p className="text-[11px] text-subtle">
              {group.expense > 0 && `支出 ¥${formatCurrency(group.expense)}`}
              {group.expense > 0 && group.income > 0 && ' · '}
              {group.income > 0 && `收入 ¥${formatCurrency(group.income)}`}
            </p>
          </div>
          <div
            className={cn('overflow-hidden', compact ? 'space-y-2' : 'card divide-y divide-line')}
          >
            {group.records.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                canDelete={currentUserId === record.user_id}
                onDelete={onDelete}
                onViewAttachments={onViewAttachments}
                compact={compact}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecordRow({
  record,
  canDelete,
  onDelete,
  onViewAttachments,
  compact,
}: {
  record: BookkeepingRecord;
  canDelete: boolean;
  onDelete: (record: BookkeepingRecord) => void;
  onViewAttachments: (record: BookkeepingRecord) => void;
  compact: boolean;
}) {
  const attachmentCount = record.attachment_count ?? 0;
  const hasImages = (record.image_count ?? 0) > 0;

  return (
    <article
      className={cn(
        'group flex items-start justify-between gap-3 bg-surface px-4 py-3',
        compact && 'rounded-xl border border-line',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-fg">{record.purpose}</p>
          {record.username && <span className="text-[11px] text-subtle">@{record.username}</span>}
          {attachmentCount > 0 && (
            <button
              type="button"
              onClick={() => onViewAttachments(record)}
              className="inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] text-subtle transition hover:bg-muted hover:text-fg"
              title={`查看附件（${attachmentCount}）`}
            >
              {hasImages ? <Image className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
              {attachmentCount}
            </button>
          )}
        </div>
        {record.description && (
          <p className="mt-0.5 truncate text-xs text-subtle">{record.description}</p>
        )}
        <p className="mt-1 text-[11px] text-subtle">{formatDateTime(record.created_at)}</p>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            record.type === 'income' ? 'text-success' : 'text-danger',
          )}
        >
          {record.type === 'income' ? '+' : '-'}¥{formatCurrency(Number(record.amount))}
        </p>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(record)}
            className="rounded-md p-1 text-subtle opacity-100 transition hover:bg-danger-soft hover:text-danger focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
            aria-label="删除记录"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}
