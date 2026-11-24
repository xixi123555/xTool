import { diffLines } from 'diff';
import { useMemo, useState } from 'react';

import { Page, PageHeader } from '../../../shared/ui/Page';
import { SegmentedControl } from '../../../shared/ui/Controls';
import { cn } from '../../../shared/lib/cn';

type DiffMode = 'text' | 'json';

interface DiffRow {
  type: 'context' | 'added' | 'removed';
  oldLine?: number;
  newLine?: number;
  content: string;
}

function prettyJson(value: string): { text: string; valid: boolean } {
  if (!value.trim()) return { text: '', valid: true };
  try {
    return { text: JSON.stringify(JSON.parse(value) as unknown, null, 2), valid: true };
  } catch {
    return { text: value, valid: false };
  }
}

function splitLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function buildRows(oldText: string, newText: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const change of diffLines(oldText, newText)) {
    const lines = splitLines(change.value);
    for (const content of lines) {
      if (change.added) {
        rows.push({ type: 'added', newLine, content });
        newLine += 1;
      } else if (change.removed) {
        rows.push({ type: 'removed', oldLine, content });
        oldLine += 1;
      } else {
        rows.push({ type: 'context', oldLine, newLine, content });
        oldLine += 1;
        newLine += 1;
      }
    }
  }
  return rows;
}

export function DiffPage() {
  const [mode, setMode] = useState<DiffMode>('text');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const prepared = mode === 'json' ? { left: prettyJson(left), right: prettyJson(right) } : null;
  const original = prepared ? prepared.left.text : left;
  const modified = prepared ? prepared.right.text : right;
  const invalidJson = prepared ? !prepared.left.valid || !prepared.right.valid : false;

  const rows = useMemo(() => buildRows(original, modified), [original, modified]);
  const stats = useMemo(
    () => ({
      added: rows.filter((row) => row.type === 'added').length,
      removed: rows.filter((row) => row.type === 'removed').length,
    }),
    [rows],
  );

  return (
    <Page>
      <PageHeader
        title="文本对比"
        description="逐行查看两段文本的差异；JSON 模式会先格式化再对比。"
        actions={
          <SegmentedControl
            value={mode}
            onChange={setMode}
            options={[
              { value: 'text', label: '文本' },
              { value: 'json', label: 'JSON' },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-medium text-subtle">原始内容</p>
            {mode === 'json' && (
              <span className="text-[11px] text-subtle">
                {prepared?.left.valid ? 'JSON 有效' : 'JSON 无效'}
              </span>
            )}
          </div>
          <textarea
            className="min-h-[180px] w-full resize-y bg-transparent p-4 font-mono text-sm text-fg outline-none placeholder:text-subtle"
            placeholder="粘贴原始内容"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="card p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-medium text-subtle">修改后内容</p>
            {mode === 'json' && (
              <span className="text-[11px] text-subtle">
                {prepared?.right.valid ? 'JSON 有效' : 'JSON 无效'}
              </span>
            )}
          </div>
          <textarea
            className="min-h-[180px] w-full resize-y bg-transparent p-4 font-mono text-sm text-fg outline-none placeholder:text-subtle"
            placeholder="粘贴修改后的内容"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            spellCheck={false}
          />
        </div>
      </div>

      {invalidJson && (
        <p className="mt-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning">
          JSON 格式不完整时会按原始文本对比。
        </p>
      )}

      <div className="card mt-3 overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <p className="text-xs font-medium text-subtle">差异</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-success">+{stats.added} 行</span>
            <span className="text-danger">-{stats.removed} 行</span>
          </div>
        </div>

        {original === modified ? (
          <p className="px-4 py-12 text-center text-sm text-subtle">两段内容完全一致。</p>
        ) : (
          <div className="scrollbar-thin max-h-[560px] overflow-auto font-mono text-[13px] leading-6">
            {rows.map((row, index) => (
              <div
                key={`${row.type}-${index}`}
                className={cn(
                  'flex min-w-full',
                  row.type === 'added' && 'bg-success-soft',
                  row.type === 'removed' && 'bg-danger-soft',
                )}
              >
                <span className="w-12 flex-shrink-0 select-none border-r border-line px-2 text-right text-[11px] text-subtle">
                  {row.oldLine ?? ''}
                </span>
                <span className="w-12 flex-shrink-0 select-none border-r border-line px-2 text-right text-[11px] text-subtle">
                  {row.newLine ?? ''}
                </span>
                <span
                  className={cn(
                    'w-5 flex-shrink-0 select-none text-center',
                    row.type === 'added' && 'text-success',
                    row.type === 'removed' && 'text-danger',
                  )}
                >
                  {row.type === 'added' ? '+' : row.type === 'removed' ? '-' : ' '}
                </span>
                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-words pr-4 text-fg">
                  {row.content || ' '}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
