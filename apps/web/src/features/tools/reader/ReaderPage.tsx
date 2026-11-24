import { Copy, Globe, Loader2, Square } from 'lucide-react';
import { useRef, useState } from 'react';

import { errorMessage } from '../../../shared/lib/http';
import { runDifyWorkflow } from '../../../shared/lib/dify';
import { toast } from '../../../shared/store/feedback';
import { Page, PageHeader } from '../../../shared/ui/Page';

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ReaderPage() {
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [reading, setReading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const handleRead = async () => {
    if (!url.trim() || reading) return;
    if (!isValidUrl(url.trim())) {
      toast('请输入以 http:// 或 https:// 开头的网址', 'error');
      return;
    }
    setReading(true);
    setContent('');
    controllerRef.current = new AbortController();
    try {
      const text = await runDifyWorkflow({
        keyName: 'web_reader',
        inputs: { input_url: url.trim() },
        signal: controllerRef.current.signal,
        onChunk: (chunk) => setContent((current) => current + chunk),
      });
      setContent(text);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      toast(errorMessage(error, '读取失败'), 'error');
    } finally {
      setReading(false);
      controllerRef.current = null;
    }
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    setReading(false);
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      toast('已复制', 'success');
    } catch {
      toast('复制失败', 'error');
    }
  };

  return (
    <Page>
      <PageHeader title="网页阅读" description="输入网址，提取正文并给出摘要。" />
      <div className="card p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              className="field pl-9"
              placeholder="https://example.com/article"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleRead();
              }}
            />
          </div>
          {reading ? (
            <button type="button" className="btn-secondary sm:w-32" onClick={handleCancel}>
              <Square className="h-4 w-4" />
              停止
            </button>
          ) : (
            <button type="button" className="btn-primary sm:w-32" onClick={() => void handleRead()}>
              开始阅读
            </button>
          )}
        </div>
      </div>

      <div className="card mt-3 min-h-[420px] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <p className="text-xs font-medium text-subtle">正文摘要</p>
          <button
            type="button"
            className="btn-ghost h-7 px-2 text-xs"
            onClick={() => void handleCopy()}
            disabled={!content}
          >
            <Copy className="h-3.5 w-3.5" />
            复制
          </button>
        </div>
        <div className="scrollbar-thin min-h-[380px] whitespace-pre-wrap p-4 text-sm leading-7 text-fg">
          {content || (
            <span className="flex items-center gap-2 text-subtle">
              {reading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> 正在读取网页…
                </>
              ) : (
                '读取结果会显示在这里'
              )}
            </span>
          )}
        </div>
      </div>
    </Page>
  );
}
