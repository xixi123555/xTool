import React, { useState, useRef, useEffect } from 'react';
import { useBookkeepingData } from './useBookkeepingData';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../../components/toast/Toast';
import { ClosableTag } from '../../components/common/ClosableTag';
import { PlusIcon } from '../../assets/icons';
import type { BookkeepingRecord, BookkeepingPurposeItem } from '../../api/bookkeeping';

interface PurposeHandlers {
  create: (name: string) => Promise<void>;
  update: (id: number, name: string) => Promise<void>;
  delete: (item: BookkeepingPurposeItem) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
}

function AddRecordForm({
  purposes,
  defaultPurpose,
  purposeHandlers,
  onAdd,
}: {
  purposes: BookkeepingPurposeItem[];
  defaultPurpose: BookkeepingPurposeItem | undefined;
  purposeHandlers: PurposeHandlers;
  onAdd: (r: { purpose: string; description: string; amount: number; type: 'expense' | 'income' }) => void;
}) {
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当有默认用途且当前用途为空时，填入默认用途（如初次加载或用户清空后）
  useEffect(() => {
    if (defaultPurpose?.name && purpose === '') {
      setPurpose(defaultPurpose.name);
    }
  }, [defaultPurpose?.id, defaultPurpose?.name, purpose]);

  useEffect(() => {
    if (inputVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputVisible]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const purposeTrim = purpose.trim();
    const amountNum = parseFloat(amount.replace(/,/g, ''));
    if (!purposeTrim) {
      showToast('请输入用途');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast('请输入有效金额');
      return;
    }
    onAdd({
      purpose: purposeTrim,
      description: description.trim(),
      amount: amountNum,
      type,
    });
    setAmount('');
    setDescription('');
    amountRef.current?.focus();
  };

  const handleInputConfirm = async () => {
    const name = inputValue.trim();
    if (name) {
      await purposeHandlers.create(name);
      setPurpose(name);
      setInputValue('');
    }
    setInputVisible(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 bg-white/80 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
            type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          支出
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${
            type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          收入
        </button>
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">金额</label>
        <input
          ref={amountRef}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full py-4 px-4 text-2xl font-semibold rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">用途</label>
        <div className="flex flex-wrap items-center gap-2">
          {purposes.map((p) => (
            <ClosableTag
              key={p.id}
              selected={purpose === p.name}
              onSelect={() => setPurpose(p.name)}
              onClose={() => purposeHandlers.delete(p)}
              isDefault={p.is_default === 1}
              onSetDefault={p.is_default !== 1 ? () => purposeHandlers.setDefault(p.id) : undefined}
            >
              {p.name}
            </ClosableTag>
          ))}
          {inputVisible ? (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputConfirm}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleInputConfirm())}
              placeholder="新用途"
              className="w-24 py-1.5 px-2 text-sm rounded-lg border border-slate-300 focus:border-slate-400 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setInputVisible(true)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600 transition"
            >
              <PlusIcon className="h-4 w-4" />
              添加用途
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="或输入自定义用途"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="mt-2 w-full py-2 px-3 rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">说明（可选）</label>
        <input
          type="text"
          placeholder="备注"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full py-2 px-3 rounded-lg border border-slate-200 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="w-full py-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
      >
        记一笔
      </button>
    </form>
  );
}

/** 将 ISO 时间戳格式化为本地时间，精确到秒 */
function formatRecordTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}:${s}`;
}

function RecordItem({
  record,
  onDelete,
  currentUserId,
}: {
  record: BookkeepingRecord;
  onDelete: (r: BookkeepingRecord) => void;
  currentUserId?: number;
}) {
  const canDelete = currentUserId === record.user_id;

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-slate-100 hover:bg-slate-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{record.purpose}</span>
          {record.username && (
            <span className="text-xs text-slate-400">@{record.username}</span>
          )}
        </div>
        {record.description && (
          <p className="text-sm text-slate-500 truncate mt-0.5">{record.description}</p>
        )}
        {record.created_at && (
          <p className="text-xs text-slate-400 mt-0.5">{formatRecordTime(record.created_at)}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`font-semibold ${
            record.type === 'income' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
        </span>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(record)}
            className="text-slate-400 hover:text-red-500 text-sm"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

export function BookkeepingPanel() {
  const {
    records,
    purposes,
    loading,
    handleAdd,
    handleDelete,
    handleCreatePurpose,
    handleUpdatePurpose,
    handleDeletePurpose,
    handleSetDefaultPurpose,
  } = useBookkeepingData();
  const user = useAppStore((s) => s.user);
  const defaultPurpose = purposes.find((p) => p.is_default === 1);

  const groupedByDate = records.reduce<Record<string, BookkeepingRecord[]>>((acc, r) => {
    const d = r.record_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const totalIncome = records.filter((r) => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = records.filter((r) => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

  if (loading) {
    return (
      <section className="flex flex-col h-full items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 p-4 border-b border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">记账</h2>
        <p className="text-sm text-slate-500">简洁记账，多人共享</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AddRecordForm
          purposes={purposes}
          defaultPurpose={defaultPurpose}
          purposeHandlers={{
            create: handleCreatePurpose,
            update: handleUpdatePurpose,
            delete: handleDeletePurpose,
            setDefault: handleSetDefaultPurpose,
          }}
          onAdd={handleAdd}
        />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-600">账单记录</h3>
            {records.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600">收入 +¥{totalIncome.toFixed(2)}</span>
                <span className="text-red-600">支出 ¥{totalExpense.toFixed(2)}</span>
                <span className="font-medium text-slate-700">
                  合计 ¥{(totalIncome - totalExpense).toFixed(2)}
                </span>
              </div>
            )}
          </div>
          {sortedDates.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">暂无记录，记一笔吧</div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="text-xs text-slate-500 mb-2">{date}</div>
                  <div className="space-y-2">
                    {groupedByDate[date].map((r) => (
                      <RecordItem
                        key={r.id}
                        record={r}
                        onDelete={handleDelete}
                        currentUserId={user?.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
