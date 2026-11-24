import type { BookkeepingPurpose } from '@xtool/shared';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { cn } from '../../../shared/lib/cn';
import { BottomSheet, Modal } from '../../../shared/ui/Overlay';
import { Badge } from '../../../shared/ui/Controls';

interface PurposeManagerProps {
  open: boolean;
  mobile: boolean;
  purposes: BookkeepingPurpose[];
  onClose: () => void;
  onAdd: (name: string) => Promise<boolean>;
  onRename: (purpose: BookkeepingPurpose, name: string) => Promise<boolean>;
  onRemove: (purpose: BookkeepingPurpose) => Promise<boolean>;
  onSetDefault: (purpose: BookkeepingPurpose) => Promise<boolean>;
}

export function PurposeManager(props: PurposeManagerProps) {
  const content = <PurposeManagerContent {...props} />;
  return props.mobile ? (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title="管理用途"
      description="用途是记账时选择的标签"
    >
      {content}
    </BottomSheet>
  ) : (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="管理用途"
      description="用途是记账时选择的标签"
    >
      {content}
    </Modal>
  );
}

function PurposeManagerContent({
  purposes,
  onAdd,
  onRename,
  onRemove,
  onSetDefault,
}: PurposeManagerProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!draft.trim() || adding) return;
    setAdding(true);
    const created = await onAdd(draft);
    setAdding(false);
    if (created) setDraft('');
  };

  const startEdit = (purpose: BookkeepingPurpose) => {
    setEditingId(purpose.id);
    setEditingValue(purpose.name);
  };

  const commitEdit = async (purpose: BookkeepingPurpose) => {
    const updated = await onRename(purpose, editingValue);
    if (updated) setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="field"
          value={draft}
          placeholder="新增用途，例如：餐饮"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleAdd();
            }
          }}
        />
        <button
          type="button"
          className="btn-primary flex-shrink-0"
          onClick={() => void handleAdd()}
          disabled={!draft.trim() || adding}
        >
          <Plus className="h-4 w-4" />
          添加
        </button>
      </div>

      {purposes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-subtle">
          还没有用途，先添加一个。
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {purposes.map((purpose) => (
            <li key={purpose.id} className="flex items-center gap-2 px-3 py-2.5">
              {editingId === purpose.id ? (
                <>
                  <input
                    className="field py-1.5"
                    value={editingValue}
                    autoFocus
                    onChange={(event) => setEditingValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void commitEdit(purpose);
                      if (event.key === 'Escape') setEditingId(null);
                    }}
                  />
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 p-0"
                    onClick={() => void commitEdit(purpose)}
                    aria-label="保存"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 p-0"
                    onClick={() => setEditingId(null)}
                    aria-label="取消"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{purpose.name}</span>
                  {purpose.is_default === 1 ? (
                    <Badge tone="accent">默认</Badge>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost h-8 px-2 text-xs"
                      onClick={() => void onSetDefault(purpose)}
                    >
                      <Star className="h-3.5 w-3.5" />
                      设为默认
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-ghost h-8 w-8 p-0"
                    onClick={() => startEdit(purpose)}
                    aria-label="重命名"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={cn('btn-ghost h-8 w-8 p-0 hover:text-danger')}
                    onClick={() => void onRemove(purpose)}
                    aria-label="删除用途"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-subtle">删除用途只影响标签列表，已有记账记录不会改变。</p>
    </div>
  );
}
