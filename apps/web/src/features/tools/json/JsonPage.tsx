import { Check, Copy, Eraser, Minimize2, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Page, PageHeader } from '../../../shared/ui/Page';
import { toast } from '../../../shared/store/feedback';

export function JsonPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const transform = (indent: number | undefined) => {
    if (!input.trim()) {
      setError('请先粘贴 JSON');
      return;
    }
    try {
      const parsed = JSON.parse(input) as unknown;
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'JSON 格式不正确');
      setOutput('');
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast('复制失败，请手动选择复制', 'error');
    }
  };

  return (
    <Page>
      <PageHeader
        title="JSON 工具"
        description="格式化、压缩与校验，输入和输出并排显示。"
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setInput('');
                setOutput('');
                setError('');
              }}
            >
              <Eraser className="h-4 w-4" />
              清空
            </button>
            <button type="button" className="btn-secondary" onClick={() => transform(undefined)}>
              <Minimize2 className="h-4 w-4" />
              压缩
            </button>
            <button type="button" className="btn-primary" onClick={() => transform(2)}>
              <Sparkles className="h-4 w-4" />
              格式化
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card flex min-h-[420px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-medium text-subtle">输入</p>
            <span className="text-[11px] text-subtle">{input.length} 字符</span>
          </div>
          <textarea
            className="min-h-[380px] flex-1 resize-none bg-transparent p-4 font-mono text-sm text-fg outline-none placeholder:text-subtle"
            placeholder={'{\n  "hello": "world"\n}'}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="card flex min-h-[420px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-medium text-subtle">输出</p>
            <button
              type="button"
              className="btn-ghost h-7 px-2 text-xs"
              onClick={() => void handleCopy()}
              disabled={!output}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <pre className="scrollbar-thin min-h-[380px] flex-1 overflow-auto p-4 font-mono text-sm text-fg">
            {output || <span className="text-subtle">格式化结果会显示在这里</span>}
          </pre>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Page>
  );
}
