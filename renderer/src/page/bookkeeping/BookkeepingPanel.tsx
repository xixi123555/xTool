import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useBookkeepingData } from './useBookkeepingData';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../../components/toast/Toast';
import { ClosableTag } from '../../components/common/ClosableTag';
import { PlusIcon } from '../../assets/icons';
import {
  getRecordAttachments,
  deleteAttachment,
  fetchAttachmentBlob,
  type BookkeepingRecord,
  type BookkeepingPurposeItem,
  type BookkeepingAttachment,
} from '../../api/bookkeeping';

interface PurposeHandlers {
  create: (name: string) => Promise<void>;
  update: (id: number, name: string) => Promise<void>;
  delete: (item: BookkeepingPurposeItem) => Promise<void>;
  setDefault: (id: number) => Promise<void>;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// 附件图标 SVG
function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a1.5 1.5 0 002.122 2.121l7-7a3 3 0 00-4.242-4.242l-7 7a4.5 4.5 0 006.364 6.364l7-7a.75.75 0 00-1.06-1.06l-7 7a3 3 0 01-4.243-4.243l7-7a1.5 1.5 0 012.121 2.121l-7 7a.75.75 0 001.061 1.061l7-7a3 3 0 000-4.242z" clipRule="evenodd" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-3 3zm5-8.81a.75.75 0 10-.75.75.75.75 0 00.75-.75z" clipRule="evenodd" />
    </svg>
  );
}

// ---------- 附件详情弹窗 ----------

interface AttachmentModalProps {
  record: BookkeepingRecord;
  currentUserId?: number;
  onClose: () => void;
  onDeleted: () => void;
}

function AttachmentModal({ record, currentUserId, onClose, onDeleted }: AttachmentModalProps) {
  const [attachments, setAttachments] = useState<BookkeepingAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<number, boolean>>({});

  const canDelete = currentUserId === record.user_id;

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getRecordAttachments(record.id);
      if (res.success && res.attachments) {
        setAttachments(res.attachments);
      }
    } catch {
      showToast('获取附件失败');
    } finally {
      setLoading(false);
    }
  }, [record.id]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // 为图片类型附件预加载 blob URL
  useEffect(() => {
    attachments.forEach((att) => {
      if (att.mime_type.startsWith('image/') && !blobUrls[att.id]) {
        setLoadingImages((prev) => ({ ...prev, [att.id]: true }));
        fetchAttachmentBlob(att.id)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setBlobUrls((prev) => ({ ...prev, [att.id]: url }));
          })
          .catch(() => {})
          .finally(() => {
            setLoadingImages((prev) => ({ ...prev, [att.id]: false }));
          });
      }
    });
    // 清理 blob URL
    return () => {
      Object.values(blobUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments]);

  const handleDownload = async (att: BookkeepingAttachment) => {
    try {
      const blob = await fetchAttachmentBlob(att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.original_name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast('下载失败');
    }
  };

  const handleDelete = async (att: BookkeepingAttachment) => {
    try {
      const res = await deleteAttachment(att.id);
      if (res.success) {
        if (blobUrls[att.id]) URL.revokeObjectURL(blobUrls[att.id]);
        setAttachments((prev) => prev.filter((a) => a.id !== att.id));
        setBlobUrls((prev) => { const next = { ...prev }; delete next[att.id]; return next; });
        onDeleted();
        showToast('已删除');
      } else {
        showToast(res.error || '删除失败');
      }
    } catch {
      showToast('删除失败');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border-primary)]">
          <div>
            <p className="font-semibold text-[var(--theme-text-primary)]">{record.purpose}</p>
            <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">附件详情</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8 text-[var(--theme-text-muted)] text-sm">加载中...</div>
          ) : attachments.length === 0 ? (
            <div className="text-center py-8 text-[var(--theme-text-muted)] text-sm">暂无附件</div>
          ) : (
            <div className="flex flex-col gap-3">
              {attachments.map((att) => {
                const isImage = att.mime_type.startsWith('image/');
                return (
                  <div key={att.id} className="rounded-xl border border-[var(--theme-border-primary)] overflow-hidden">
                    {/* 图片预览 */}
                    {isImage && (
                      <div className="bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[120px]">
                        {loadingImages[att.id] ? (
                          <div className="text-xs text-[var(--theme-text-muted)] py-6">加载中...</div>
                        ) : blobUrls[att.id] ? (
                          <img
                            src={blobUrls[att.id]}
                            alt={att.original_name}
                            className="max-w-full max-h-64 object-contain block"
                          />
                        ) : (
                          <div className="text-xs text-[var(--theme-text-muted)] py-6">加载失败</div>
                        )}
                      </div>
                    )}
                    {/* 文件信息栏 */}
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-[var(--theme-bg-secondary)]">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[var(--theme-bg-tertiary)] flex items-center justify-center">
                        {isImage
                          ? <ImageIcon className="w-4 h-4 text-[var(--theme-text-quaternary)]" />
                          : <PaperclipIcon className="w-4 h-4 text-[var(--theme-text-quaternary)]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--theme-text-secondary)] truncate">{att.original_name}</p>
                        <p className="text-xs text-[var(--theme-text-muted)]">{formatFileSize(att.file_size)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleDownload(att)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-[var(--theme-border-primary)] text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                        >
                          下载
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(att)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- 添加记录表单 ----------

function AddRecordForm({
  purposes,
  defaultPurpose,
  purposeHandlers,
  onAdd,
  onTypeChange,
  onPurposeChange,
}: {
  purposes: BookkeepingPurposeItem[];
  defaultPurpose: BookkeepingPurposeItem | undefined;
  purposeHandlers: PurposeHandlers;
  onAdd: (r: { purpose: string; description: string; amount: number; type: 'expense' | 'income'; files?: File[] }) => void;
  onTypeChange?: (t: 'expense' | 'income') => void;
  onPurposeChange?: (purpose: string) => void;
}) {
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [descriptionError, setDescriptionError] = useState(false);
  const [descriptionShake, setDescriptionShake] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const setPurposeWithNotify = useCallback((nextPurpose: string) => {
    setPurpose(nextPurpose);
    onPurposeChange?.(nextPurpose);
  }, [onPurposeChange]);

  const amountRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { amountRef.current?.focus(); }, []);

  const handleTypeClick = (next: 'expense' | 'income') => {
    setType(next);
    onTypeChange?.(next);
  };

  useEffect(() => {
    if (defaultPurpose?.name && purpose === '') {
      setPurposeWithNotify(defaultPurpose.name);
    }
  }, [defaultPurpose?.id, defaultPurpose?.name, purpose, setPurposeWithNotify]);

  useEffect(() => {
    if (inputVisible && inputRef.current) inputRef.current.focus();
  }, [inputVisible]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles((prev) => {
        const existing = new Set(prev.map((f) => f.name + f.size));
        const newFiles = files.filter((f) => !existing.has(f.name + f.size));
        return [...prev, ...newFiles];
      });
      setDescriptionError(false);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const purposeTrim = purpose.trim();
    const amountNum = parseFloat(amount.replace(/,/g, ''));
    if (!purposeTrim) { showToast('请输入用途'); return; }
    if (!description.trim() && pendingFiles.length === 0) {
      setDescriptionError(true);
      setDescriptionShake(true);
      setTimeout(() => setDescriptionShake(false), 400);
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) { showToast('请输入有效金额'); return; }
    onAdd({
      purpose: purposeTrim,
      description: description.trim(),
      amount: amountNum,
      type,
      files: pendingFiles.length > 0 ? pendingFiles : undefined,
    });
    setAmount('');
    setDescription('');
    setDescriptionError(false);
    setPendingFiles([]);
    amountRef.current?.focus();
  };

  const handleInputConfirm = async () => {
    const name = inputValue.trim();
    if (name) {
      await purposeHandlers.create(name);
      setPurposeWithNotify(name);
      setInputValue('');
    }
    setInputVisible(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 bg-white/80 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex gap-2">
        <button type="button" onClick={() => handleTypeClick('expense')}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
          支出
        </button>
        <button type="button" onClick={() => handleTypeClick('income')}
          className={`flex-1 py-3 rounded-xl text-sm font-medium transition ${type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
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
              onSelect={() => setPurposeWithNotify(p.name)}
              onClose={() => purposeHandlers.delete(p)}
              isDefault={p.is_default === 1}
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
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">
          说明
          <span className="text-red-500 ml-0.5">*</span>
        </label>
        {/* 输入框 + 上传按钮 */}
        <div className={`flex items-center rounded-lg border transition-colors focus-within:border-slate-400 ${
          descriptionError ? 'border-red-400' : 'border-slate-200'
        } ${descriptionShake ? 'input-shake' : ''}`}>
          <input
            type="text"
            placeholder="备注"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.trim()) setDescriptionError(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1 py-2 px-3 bg-transparent focus:outline-none"
          />
          {/* 隐藏的文件 input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="上传图片或文件"
            className="flex-shrink-0 w-8 h-8 mr-1 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative"
          >
            <PaperclipIcon className="w-4 h-4" />
            {pendingFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-slate-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                {pendingFiles.length}
              </span>
            )}
          </button>
        </div>

        {/* 已选择文件列表 */}
        {pendingFiles.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                {f.type.startsWith('image/')
                  ? <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  : <PaperclipIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                }
                <span className="flex-1 text-xs text-slate-600 truncate">{f.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{formatFileSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="w-full py-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition">
        记一笔
      </button>
    </form>
  );
}

// ---------- 记录条目 ----------

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
  onViewAttachments,
  currentUserId,
}: {
  record: BookkeepingRecord;
  onDelete: (r: BookkeepingRecord) => void;
  onViewAttachments: (r: BookkeepingRecord) => void;
  currentUserId?: number;
}) {
  const canDelete = currentUserId === record.user_id;
  const hasImages = (record.image_count ?? 0) > 0;
  const hasFiles = (record.attachment_count ?? 0) > (record.image_count ?? 0);
  const hasAnyAttachment = (record.attachment_count ?? 0) > 0;

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-slate-100 hover:bg-slate-50">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{record.purpose}</span>
          {record.username && (
            <span className="text-xs text-slate-400">@{record.username}</span>
          )}
          {/* 附件图标 */}
          {hasAnyAttachment && (
            <button
              type="button"
              onClick={() => onViewAttachments(record)}
              title={`查看附件（${record.attachment_count}个）`}
              className="inline-flex items-center gap-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {hasImages && <ImageIcon className="w-3.5 h-3.5" />}
              {hasFiles && <PaperclipIcon className="w-3.5 h-3.5" />}
            </button>
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
        <span className={`font-semibold ${record.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
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

// ---------- 主面板 ----------

export function BookkeepingPanel() {
  const {
    records,
    purposes,
    loading,
    fetchRecords,
    handleAdd,
    handleDelete,
    handleCreatePurpose,
    handleUpdatePurpose,
    handleDeletePurpose,
    handleSetDefaultPurpose,
  } = useBookkeepingData();
  const user = useAppStore((s) => s.user);
  const defaultPurpose = purposes.find((p) => p.is_default === 1);

  const [currentType, setCurrentType] = useState<'expense' | 'income'>('expense');
  const [currentPurpose, setCurrentPurpose] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [attachmentRecord, setAttachmentRecord] = useState<BookkeepingRecord | null>(null);

  useEffect(() => {
    if (!currentPurpose && defaultPurpose?.name) {
      setCurrentPurpose(defaultPurpose.name);
    }
  }, [defaultPurpose?.id, defaultPurpose?.name, currentPurpose]);

  const baseFilteredRecords = useMemo(
    () => records.filter((r) => r.type === currentType && (!currentPurpose || r.purpose === currentPurpose)),
    [records, currentType, currentPurpose]
  );

  const normalizedKeyword = searchKeyword.trim().toLowerCase();

  const filteredRecords = useMemo(() => {
    if (!normalizedKeyword) return baseFilteredRecords;

    const matched = baseFilteredRecords
      .map((r) => {
        const desc = (r.description || '').toLowerCase();
        const dateText = `${r.record_date || ''} ${r.created_at || ''}`.toLowerCase();
        const amountText = `${r.amount} ${r.amount.toFixed(2)} ¥${r.amount.toFixed(2)} ${r.amount.toFixed(0)}`.toLowerCase();

        let score = 0;
        if (desc.includes(normalizedKeyword)) score = 3;
        else if (dateText.includes(normalizedKeyword)) score = 2;
        else if (amountText.includes(normalizedKeyword)) score = 1;

        return { record: r, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const dateCmp = String(b.record.record_date).localeCompare(String(a.record.record_date));
        if (dateCmp !== 0) return dateCmp;
        return b.record.id - a.record.id;
      });

    return matched.map((item) => item.record);
  }, [baseFilteredRecords, normalizedKeyword]);

  const groupedByDate = filteredRecords.reduce<Record<string, BookkeepingRecord[]>>((acc, r) => {
    const d = r.record_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const filteredTotal = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

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

      <div className="relative flex-1 overflow-y-auto pb-4 px-0">
        <div className="pt-4 pb-4">
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
            onTypeChange={setCurrentType}
            onPurposeChange={setCurrentPurpose}
          />
        </div>

        <div>
          <div className="sticky top-0 z-30 mb-3 rounded-xl border border-slate-200/80 bg-white/95 p-3 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-600">
                记账记录{currentPurpose ? ` · ${currentPurpose}` : ''}
              </h3>
              {records.length > 0 && (
                <div className="text-sm font-medium">
                  {currentType === 'expense'
                    ? <span className="text-red-600">支出 ¥{filteredTotal.toFixed(2)}</span>
                    : <span className="text-green-600">收入 +¥{filteredTotal.toFixed(2)}</span>
                  }
                </div>
              )}
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索备注/时间/金额（优先匹配备注）"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            {normalizedKeyword && (
              <div className="mt-1 text-xs text-slate-400">
                共匹配 {filteredRecords.length} 条记录
              </div>
            )}
          </div>
          {sortedDates.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {filteredRecords.length === 0 && records.length === 0
                ? '暂无记录，记一笔吧'
                : normalizedKeyword
                  ? '未找到匹配记录'
                  : `暂无${currentPurpose ? `「${currentPurpose}」` : ''}${currentType === 'expense' ? '支出' : '收入'}记录`}
            </div>
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
                        onViewAttachments={setAttachmentRecord}
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

      {/* 附件详情弹窗 */}
      {attachmentRecord && (
        <AttachmentModal
          record={attachmentRecord}
          currentUserId={user?.id}
          onClose={() => setAttachmentRecord(null)}
          onDeleted={fetchRecords}
        />
      )}
    </section>
  );
}
