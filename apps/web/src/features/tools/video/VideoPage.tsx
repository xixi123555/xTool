import { Download, Film, Loader2, RotateCcw, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '../../../shared/lib/http';
import { formatFileSize } from '../../../shared/lib/format';
import { toast } from '../../../shared/store/feedback';
import { Page, PageHeader } from '../../../shared/ui/Page';
import { convertVideoToGif, type ConvertStage } from './api';

const ACCEPTED_EXTENSIONS = ['.mp4', '.mkv', '.mov'];
const MAX_SIZE = 500 * 1024 * 1024;

type Status = 'idle' | 'processing' | 'done';

export function VideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [stage, setStage] = useState<ConvertStage>('uploading');
  const [gifUrl, setGifUrl] = useState('');
  const [gifSize, setGifSize] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef('');

  const cleanupUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = '';
    }
  }, []);

  useEffect(() => cleanupUrl, [cleanupUrl]);

  const pickFile = (picked: File | null) => {
    if (!picked) return;
    const extension = `.${picked.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      toast('仅支持 MP4、MKV、MOV 格式', 'error');
      return;
    }
    if (picked.size > MAX_SIZE) {
      toast('视频不能超过 500MB', 'error');
      return;
    }
    cleanupUrl();
    setGifUrl('');
    setGifSize(0);
    setStatus('idle');
    setFile(picked);
  };

  const handleConvert = async () => {
    if (!file || status === 'processing') return;
    setStatus('processing');
    setStage('uploading');
    try {
      const blob = await convertVideoToGif(file, setStage);
      cleanupUrl();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setGifUrl(url);
      setGifSize(blob.size);
      setStatus('done');
      toast('GIF 已生成', 'success');
    } catch (error) {
      setStatus('idle');
      toast(errorMessage(error, '转换失败，请检查视频格式'), 'error');
    }
  };

  const handleReset = () => {
    cleanupUrl();
    setFile(null);
    setGifUrl('');
    setGifSize(0);
    setStatus('idle');
  };

  return (
    <Page>
      <PageHeader title="视频转 GIF" description="上传短视频，服务端生成 480px 宽的 GIF。" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              pickFile(event.dataTransfer.files[0] ?? null);
            }}
            className={`flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/50'
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <UploadCloud className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-medium text-fg">点击或拖拽视频到这里</p>
            <p className="mt-1 text-xs text-subtle">支持 MP4 / MKV / MOV，最大 500MB</p>
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mkv,.mov,video/mp4,video/quicktime"
              className="hidden"
              onChange={(event) => {
                pickFile(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
            />
          </div>

          {file && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-muted px-3 py-2.5">
              <Film className="h-4 w-4 flex-shrink-0 text-subtle" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{file.name}</p>
                <p className="text-[11px] text-subtle">{formatFileSize(file.size)}</p>
              </div>
              <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={handleReset}>
                移除
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => void handleConvert()}
            disabled={!file || status === 'processing'}
          >
            {status === 'processing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {stage === 'uploading' ? '上传中…' : '转换中…'}
              </>
            ) : (
              '开始转换'
            )}
          </button>

          <p className="mt-2 text-center text-xs text-subtle">
            转换耗时取决于视频长度，请保持页面打开。
          </p>
        </div>

        <div className="card flex min-h-64 flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="section-title">预览</p>
            {status === 'done' && (
              <span className="text-xs text-subtle">{formatFileSize(gifSize)}</span>
            )}
          </div>

          {gifUrl ? (
            <>
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-muted p-2">
                <img
                  src={gifUrl}
                  alt="转换后的 GIF"
                  className="max-h-[420px] max-w-full object-contain"
                />
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  className="btn-primary flex-1"
                  href={gifUrl}
                  download={`${file?.name.replace(/\.[^.]+$/, '') ?? 'video'}.gif`}
                >
                  <Download className="h-4 w-4" />
                  下载 GIF
                </a>
                <button type="button" className="btn-secondary" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                  重新开始
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line text-center">
              <Film className="h-8 w-8 text-subtle" />
              <p className="mt-2 text-sm text-subtle">
                {status === 'processing' ? '正在生成 GIF…' : '生成的 GIF 会显示在这里'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
