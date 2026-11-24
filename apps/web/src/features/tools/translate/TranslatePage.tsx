import { ArrowLeftRight, Copy, Languages, Loader2, Square } from 'lucide-react';
import { useRef, useState } from 'react';

import { errorMessage } from '../../../shared/lib/http';
import { runDifyWorkflow } from '../../../shared/lib/dify';
import { toast } from '../../../shared/store/feedback';
import { Page, PageHeader } from '../../../shared/ui/Page';

function detectLanguage(text: string): '中文' | 'English' {
  return /[\u4e00-\u9fa5]/.test(text) ? '中文' : 'English';
}

export function TranslatePage() {
  const [source, setSource] = useState('');
  const [result, setResult] = useState('');
  const [translating, setTranslating] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const handleTranslate = async () => {
    if (!source.trim() || translating) return;
    setTranslating(true);
    setResult('');
    controllerRef.current = new AbortController();
    try {
      const text = await runDifyWorkflow({
        keyName: 'translation',
        inputs: { word: source },
        signal: controllerRef.current.signal,
        onChunk: (chunk) => setResult((current) => current + chunk),
      });
      setResult(text);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      toast(errorMessage(error, '翻译失败'), 'error');
    } finally {
      setTranslating(false);
      controllerRef.current = null;
    }
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    setTranslating(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast('已复制', 'success');
    } catch {
      toast('复制失败', 'error');
    }
  };

  return (
    <Page>
      <PageHeader
        title="翻译"
        description="中英文互译，翻译结果会边生成边显示。"
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSource('');
                setResult('');
              }}
            >
              清空
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setSource(result);
                setResult(source);
              }}
              disabled={translating || !result}
            >
              <ArrowLeftRight className="h-4 w-4" />
              交换
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card flex min-h-[380px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
              <Languages className="h-3.5 w-3.5" />
              {source ? detectLanguage(source) : '输入文本'}
            </p>
            <span className="text-[11px] text-subtle">{source.length} 字符</span>
          </div>
          <textarea
            className="min-h-[300px] flex-1 resize-none bg-transparent p-4 text-sm leading-6 text-fg outline-none placeholder:text-subtle"
            placeholder="输入要翻译的内容，中文或英文都可以"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          />
          <div className="border-t border-line p-3">
            {translating ? (
              <button type="button" className="btn-secondary w-full" onClick={handleCancel}>
                <Square className="h-4 w-4" />
                停止
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary w-full"
                onClick={() => void handleTranslate()}
                disabled={!source.trim()}
              >
                开始翻译
              </button>
            )}
          </div>
        </div>

        <div className="card flex min-h-[380px] flex-col p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-medium text-subtle">译文</p>
            <button
              type="button"
              className="btn-ghost h-7 px-2 text-xs"
              onClick={() => void handleCopy()}
              disabled={!result}
            >
              <Copy className="h-3.5 w-3.5" />
              复制
            </button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto p-4 text-sm leading-6 text-fg">
            {result || (
              <span className="flex items-center gap-2 text-subtle">
                {translating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> 正在翻译…
                  </>
                ) : (
                  '译文会显示在这里'
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
