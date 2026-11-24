import { ListChecks, Plus, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { Page, PageHeader, Spinner, EmptyState } from '../../shared/ui/Page';
import { BottomSheet, Modal } from '../../shared/ui/Overlay';
import { TodoCardView } from './TodoCardView';
import { useTodoData } from './useTodoData';

export function TodoPage() {
  const isMobile = useIsMobile();
  const todo = useTodoData();
  const [sortByStar, setSortByStar] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');

  const sortedCards = useMemo(() => {
    return [...todo.cards].sort((left, right) => {
      if (sortByStar && left.starred !== right.starred) return left.starred ? -1 : 1;
      return (right.updated_at ?? 0) - (left.updated_at ?? 0);
    });
  }, [todo.cards, sortByStar]);

  const totalItems = todo.cards.reduce((sum, card) => sum + (card.items?.length ?? 0), 0);
  const openItems = todo.cards.reduce(
    (sum, card) => sum + (card.items ?? []).filter((item) => !item.completed).length,
    0,
  );

  const handleAddCard = async () => {
    if (!name.trim()) return;
    const created = await todo.addCard({
      name,
      tags: tags
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    if (created) {
      setName('');
      setTags('');
      setAddOpen(false);
    }
  };

  if (todo.loading) {
    return (
      <Page>
        <Spinner />
      </Page>
    );
  }

  const addForm = (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="card-name">
          卡片名称
        </label>
        <input
          id="card-name"
          className="field"
          value={name}
          autoFocus
          placeholder="例如：本周待办、装修清单"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAddCard();
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor="card-tags">
          标签 <span className="font-normal text-subtle">（可选，用逗号分隔）</span>
        </label>
        <input
          id="card-tags"
          className="field"
          value={tags}
          placeholder="工作, 生活"
          onChange={(event) => setTags(event.target.value)}
        />
      </div>
      <button
        type="button"
        className="btn-primary w-full"
        onClick={() => void handleAddCard()}
        disabled={!name.trim() || todo.saving}
      >
        <Plus className="h-4 w-4" />
        创建卡片
      </button>
    </div>
  );

  return (
    <Page>
      <PageHeader
        title="待办"
        description={`${todo.cards.length} 张卡片 · ${openItems}/${totalItems} 项未完成`}
        actions={
          <>
            <button
              type="button"
              className={`btn-secondary ${sortByStar ? 'text-warning' : ''}`}
              onClick={() => setSortByStar((value) => !value)}
              title={sortByStar ? '按标星优先排序' : '按更新时间排序'}
            >
              <Star className={`h-4 w-4 ${sortByStar ? 'fill-current' : ''}`} />
              {sortByStar ? '标星优先' : '最近更新'}
            </button>
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              新建卡片
            </button>
          </>
        }
      />

      {sortedCards.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-8 w-8" />}
          title="还没有待办卡片"
          description="把一件需要持续推进的事拆成一张卡片，再逐项完成。"
          action={
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              新建第一张卡片
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedCards.map((card) => (
            <TodoCardView
              key={card.id}
              card={card}
              onToggleStar={(item) => void todo.toggleStar(item)}
              onRename={todo.renameCard}
              onDelete={(item) => void todo.removeCard(item)}
              onAddItem={todo.addItem}
              onToggleItem={(item, todoItem) => void todo.toggleItem(item, todoItem)}
              onRemoveItem={(item, todoItem) => void todo.removeItem(item, todoItem)}
            />
          ))}
        </div>
      )}

      {isMobile ? (
        <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="新建卡片">
          {addForm}
        </BottomSheet>
      ) : (
        <Modal open={addOpen} onClose={() => setAddOpen(false)} title="新建卡片">
          {addForm}
        </Modal>
      )}
    </Page>
  );
}
