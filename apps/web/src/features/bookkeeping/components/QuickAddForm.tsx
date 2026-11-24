import type { BookkeepingPurpose, BookkeepingType } from '@xtool/shared';
import { Check, Paperclip, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '../../../shared/lib/cn';
import { formatFileSize } from '../../../shared/lib/format';
import { sanitizeAmountInput } from '../lib/bookkeeping';
import type { AddRecordInput } from '../hooks/useBookkeeping';

interface QuickAddFormProps {
  purposes: BookkeepingPurpose[];
  defaultPurpose?: BookkeepingPurpose;
  submitting: boolean;
  onCreatePurpose: (name: string) => Promise<boolean>;
  onAdd: (input: AddRecordInput) => Promise<boolean>;
  compact?: boolean;
}

export function QuickAddForm({
  purposes,
  defaultPurpose,
  submitting,
  onCreatePurpose,
  onAdd,
  compact = false,
}: QuickAddFormProps) {
  const [type, setType] = useState<BookkeepingType>('expense');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState(defaultPurpose?.name ?? purposes[0]?.name ?? '');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [purposeInputOpen, setPurposeInputOpen] = useState(false);
  const [purposeDraft, setPurposeDraft] = useState('');
  const [creatingPurpose, setCreatingPurpose] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const purposeInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPurpose((current) => {
      if (current && purposes.some((item) => item.name === current)) return current;
      return defaultPurpose?.name ?? purposes[0]?.name ?? '';
    });
  }, [purposes, defaultPurpose]);

  useEffect(() => {
    if (purposeInputOpen) purposeInputRef.current?.focus();
  }, [purposeInputOpen]);

  const handleCreatePurpose = async () => {
    const name = purposeDraft.trim();
    if (!name || creatingPurpose) return;
    setCreatingPurpose(true);
    const created = await onCreatePurpose(name);
    setCreatingPurpose(false);
    if (created) {
      setPurpose(name);
      setPurposeDraft('');
      setPurposeInputOpen(false);
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length > 0) {
      setFiles((current) => {
        const keys = new Set(current.map((file) => `${file.name}-${file.size}`));
        return [...current, ...picked.filter((file) => !keys.has(`${file.name}-${file.size}`))];
      });
    }
    event.target.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!purpose) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const created = await onAdd({
      purpose,
      description: description.trim(),
      amount: parsedAmount,
      type,
      files: files.length > 0 ? files : undefined,
    });

    if (created) {
      setAmount('');
      setDescription('');
      setFiles([]);
      amountRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', !compact && 'card p-5')}>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { value: 'expense', label: '支出' },
            { value: 'income', label: '收入' },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setType(item.value)}
            className={cn(
              'rounded-lg py-2 text-sm font-medium transition',
              type === item.value
                ? item.value === 'expense'
                  ? 'bg-surface text-danger shadow-sm'
                  : 'bg-surface text-success shadow-sm'
                : 'text-subtle hover:text-fg',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="record-amount">
          金额
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-subtle">
            ¥
          </span>
          <input
            id="record-amount"
            ref={amountRef}
            className="field py-3 pl-8 text-2xl font-semibold tabular-nums"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(sanitizeAmountInput(event.target.value))}
            autoFocus={!compact}
          />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0">用途</label>
          {!purposeInputOpen && (
            <button
              type="button"
              className="text-xs font-medium text-accent hover:underline"
              onClick={() => setPurposeInputOpen(true)}
            >
              + 新用途
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {purposes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPurpose(item.name)}
              className={cn('chip', purpose === item.name && 'chip-active')}
            >
              {item.name}
              {item.is_default === 1 && <span className="text-[10px] text-subtle">默认</span>}
            </button>
          ))}
          {purposeInputOpen && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft px-2 py-1">
              <input
                ref={purposeInputRef}
                className="w-24 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-subtle"
                value={purposeDraft}
                placeholder="用途名称"
                onChange={(event) => setPurposeDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleCreatePurpose();
                  }
                  if (event.key === 'Escape') {
                    setPurposeInputOpen(false);
                    setPurposeDraft('');
                  }
                }}
                onBlur={() => {
                  if (!purposeDraft.trim()) {
                    setPurposeInputOpen(false);
                    return;
                  }
                  void handleCreatePurpose();
                }}
              />
              <button
                type="button"
                className="text-accent"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void handleCreatePurpose()}
                aria-label="确认新增用途"
              >
                {creatingPurpose ? (
                  <span className="text-xs">…</span>
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </span>
          )}
          {purposes.length === 0 && !purposeInputOpen && (
            <button
              type="button"
              className="chip border-dashed"
              onClick={() => setPurposeInputOpen(true)}
            >
              <Plus className="h-3 w-3" /> 添加用途
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="record-description">
          备注 <span className="font-normal text-subtle">（可选）</span>
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="record-description"
            className="field"
            placeholder="例如：午饭、打车、工资"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            onChange={handleFiles}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary h-10 w-10 flex-shrink-0 p-0"
            title="添加附件"
            aria-label="添加附件"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>

        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-2 rounded-lg border border-line bg-muted px-2.5 py-1.5 text-xs"
              >
                <Paperclip className="h-3 w-3 flex-shrink-0 text-subtle" />
                <span className="min-w-0 flex-1 truncate text-fg">{file.name}</span>
                <span className="flex-shrink-0 text-subtle">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  className="text-subtle hover:text-danger"
                  onClick={() =>
                    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label="移除附件"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        className="btn-primary w-full py-3"
        disabled={submitting || !purpose || !amount}
      >
        {submitting ? '保存中…' : '记一笔'}
      </button>
    </form>
  );
}
