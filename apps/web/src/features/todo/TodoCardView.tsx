import type { TodoCard, TodoItem } from '@xtool/shared';
import { Check, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '../../shared/lib/cn';

interface TodoCardViewProps {
  card: TodoCard;
  onToggleStar: (card: TodoCard) => void;
  onRename: (card: TodoCard, name: string) => Promise<boolean>;
  onDelete: (card: TodoCard) => void;
  onAddItem: (card: TodoCard, content: string) => Promise<boolean>;
  onToggleItem: (card: TodoCard, item: TodoItem) => void;
  onRemoveItem: (card: TodoCard, item: TodoItem) => void;
}

export function TodoCardView({
  card,
  onToggleStar,
  onRename,
  onDelete,
  onAddItem,
  onToggleItem,
  onRemoveItem,
}: TodoCardViewProps) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(card.name);
  const items = useMemo(() => card.items ?? [], [card.items]);
  const completed = items.filter((item) => item.completed).length;
  const progress = items.length === 0 ? 0 : Math.round((completed / items.length) * 100);

  const orderedItems = useMemo(
    () => [...items].sort((left, right) => Number(left.completed) - Number(right.completed)),
    [items],
  );

  const handleAdd = async () => {
    if (!draft.trim()) return;
    const created = await onAddItem(card, draft);
    if (created) setDraft('');
  };

  const handleRename = async () => {
    const updated = await onRename(card, nameDraft);
    if (updated) setEditing(false);
  };

  return (
    <article className="group card flex flex-col p-4">
      <header className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onToggleStar(card)}
          className={cn(
            'mt-0.5 rounded-md p-1 transition hover:bg-muted',
            card.starred ? 'text-warning' : 'text-subtle',
          )}
          aria-label={card.starred ? '取消标星' : '标星'}
        >
          <Star className={cn('h-4 w-4', card.starred && 'fill-current')} />
        </button>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                className="field py-1.5 text-sm"
                value={nameDraft}
                autoFocus
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleRename();
                  if (event.key === 'Escape') {
                    setEditing(false);
                    setNameDraft(card.name);
                  }
                }}
              />
              <button
                type="button"
                className="btn-ghost h-8 w-8 p-0"
                onClick={() => void handleRename()}
                aria-label="保存"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="btn-ghost h-8 w-8 p-0"
                onClick={() => {
                  setEditing(false);
                  setNameDraft(card.name);
                }}
                aria-label="取消"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{card.name}</h3>
              <button
                type="button"
                className="btn-ghost h-7 w-7 p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                onClick={() => {
                  setEditing(true);
                  setNameDraft(card.name);
                }}
                aria-label="重命名"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn-ghost h-7 w-7 p-0 text-subtle hover:text-danger md:opacity-0 md:group-hover:opacity-100"
                onClick={() => onDelete(card)}
                aria-label="删除卡片"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {card.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-subtle">
                {tag}
              </span>
            ))}
            <span className="text-[11px] text-subtle">
              {completed}/{items.length}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-3 space-y-1">
        {orderedItems.map((item) => (
          <li
            key={item.id}
            className="group/item flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-muted"
          >
            <button
              type="button"
              onClick={() => onToggleItem(card, item)}
              className={cn(
                'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition',
                item.completed
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-line text-transparent',
              )}
              aria-label={item.completed ? '标记未完成' : '标记完成'}
            >
              <Check className="h-3 w-3" />
            </button>
            <span
              className={cn(
                'min-w-0 flex-1 break-words text-sm',
                item.completed ? 'text-subtle line-through' : 'text-fg',
              )}
            >
              {item.content}
            </span>
            <button
              type="button"
              onClick={() => onRemoveItem(card, item)}
              className="mt-0.5 rounded p-0.5 text-subtle opacity-100 transition hover:text-danger md:opacity-0 md:group-hover/item:opacity-100"
              aria-label="删除待办项"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-1.5">
        <input
          className="field py-2 text-sm"
          placeholder="添加一项待办，回车保存"
          value={draft}
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
          className="btn-secondary h-9 w-9 flex-shrink-0 p-0"
          onClick={() => void handleAdd()}
          disabled={!draft.trim()}
          aria-label="添加待办项"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
