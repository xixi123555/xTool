import React, { useState, useRef, useCallback } from 'react';
import { convertVideoToGif, ConvertProgress } from '../../api/videoToGif';

type Status = 'idle' | 'uploading' | 'converting' | 'done' | 'error';

const ACCEPTED_TYPES = ['.mp4', '.mkv', '.mov'];
const ACCEPTED_MIME = ['video/mp4', 'video/x-matroska', 'video/quicktime'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12">
      {/* 旋转圆圈动画 */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-[var(--theme-border-primary)]" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--theme-text-primary)] animate-spin" />
      </div>
      <p className="text-sm text-[var(--theme-text-tertiary)] animate-pulse">{message}</p>
    </div>
  );
}

function ProgressDots({ status }: { status: 'uploading' | 'converting' }) {
  const steps = [
    { key: 'uploading', label: '上传视频' },
    { key: 'converting', label: '转换中' },
    { key: 'done', label: '完成' },
  ];
  const currentIdx = status === 'uploading' ? 0 : 1;

  return (
    <div className="flex items-center gap-2 mt-4">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500',
                idx < currentIdx
                  ? 'bg-[var(--theme-bg-nav-active)] text-[var(--theme-text-inverse)]'
                  : idx === currentIdx
                    ? 'bg-[var(--theme-bg-nav-active)] text-[var(--theme-text-inverse)] ring-2 ring-offset-2 ring-[var(--theme-text-primary)] animate-pulse'
                    : 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-muted)]',
              ].join(' ')}
            >
              {idx < currentIdx ? '✓' : idx + 1}
            </div>
            <span className="text-xs text-[var(--theme-text-quaternary)] whitespace-nowrap">
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={[
                'flex-1 h-0.5 mb-4 transition-all duration-500',
                idx < currentIdx
                  ? 'bg-[var(--theme-text-primary)]'
                  : 'bg-[var(--theme-border-primary)]',
              ].join(' ')}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export function VideoToGifPanel() {
  const [status, setStatus] = useState<Status>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [gifBlob, setGifBlob] = useState<Blob | null>(null);
  const [gifSize, setGifSize] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gifObjectUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (gifObjectUrlRef.current) {
      URL.revokeObjectURL(gifObjectUrlRef.current);
      gifObjectUrlRef.current = null;
    }
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(ext) && !ACCEPTED_MIME.includes(file.type)) {
        setErrorMsg('仅支持 MP4、MKV、MOV 格式的视频文件');
        return;
      }

      cleanup();
      setSelectedFile(file);
      setGifUrl(null);
      setGifBlob(null);
      setGifSize(0);
      setErrorMsg('');
      setStatus('uploading');
      setProgressMsg('正在上传视频...');

      try {
        const blob = await convertVideoToGif(file, (progress: ConvertProgress) => {
          setStatus(progress.status === 'error' ? 'error' : (progress.status as Status));
          setProgressMsg(progress.message);
        });

        const url = URL.createObjectURL(blob);
        gifObjectUrlRef.current = url;
        setGifUrl(url);
        setGifBlob(blob);
        setGifSize(blob.size);
        setStatus('done');
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : '转换失败，请重试';
        setErrorMsg(msg);
        setStatus('error');
      }
    },
    [cleanup]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!gifBlob) return;
    const a = document.createElement('a');
    const url = URL.createObjectURL(gifBlob);
    a.href = url;
    const baseName = selectedFile?.name.replace(/\.[^.]+$/, '') ?? 'output';
    a.download = `${baseName}.gif`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleReset = () => {
    cleanup();
    setStatus('idle');
    setGifUrl(null);
    setGifBlob(null);
    setSelectedFile(null);
    setErrorMsg('');
    setProgressMsg('');
  };

  const isProcessing = status === 'uploading' || status === 'converting';

  return (
    <div className="flex flex-col h-full p-5 gap-5 overflow-y-auto bg-[var(--theme-bg-primary)]">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--theme-text-primary)]">视频转 GIF</h1>
          <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
            支持 MP4 · MKV · MOV，最大 500MB
          </p>
        </div>
        {status !== 'idle' && !isProcessing && (
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-md border border-[var(--theme-border-primary)] text-[var(--theme-text-tertiary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            重新转换
          </button>
        )}
      </div>

      {/* 上传区域 */}
      {(status === 'idle' || status === 'error') && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 py-14 px-6',
            isDragOver
              ? 'border-[var(--theme-text-primary)] bg-[var(--theme-bg-tertiary)] scale-[1.01]'
              : 'border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] hover:border-[var(--theme-border-secondary)] hover:bg-[var(--theme-bg-tertiary)]',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mkv,.mov,video/mp4,video/x-matroska,video/quicktime"
            className="hidden"
            onChange={handleInputChange}
          />
          <div
            className={[
              'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-200',
              isDragOver ? 'scale-110 bg-[var(--theme-bg-nav-active)]' : 'bg-[var(--theme-bg-tertiary)]',
            ].join(' ')}
          >
            <span className={isDragOver ? 'text-[var(--theme-text-inverse)]' : ''}>🎬</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[var(--theme-text-secondary)]">
              {isDragOver ? '松开鼠标上传' : '点击或拖拽视频到此处'}
            </p>
            <p className="text-xs text-[var(--theme-text-muted)] mt-1">MP4 · MKV · MOV</p>
          </div>
          {status === 'error' && errorMsg && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* 处理中状态 */}
      {isProcessing && (
        <div className="flex flex-col items-center rounded-xl border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] px-8 py-10 gap-2">
          {selectedFile && (
            <div className="w-full flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-bg-tertiary)] mb-2">
              <span className="text-xl">📹</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--theme-text-secondary)] truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-[var(--theme-text-muted)]">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          )}
          <ProgressDots status={status as 'uploading' | 'converting'} />
          <LoadingSpinner message={progressMsg} />
          <p className="text-xs text-[var(--theme-text-muted)] text-center max-w-xs">
            视频转换需要一定时间，文件越大耗时越长，请耐心等待
          </p>
        </div>
      )}

      {/* 转换完成 */}
      {status === 'done' && gifUrl && (
        <div className="flex flex-col gap-4">
          {/* 文件信息栏 */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--theme-bg-nav-active)] flex items-center justify-center text-[var(--theme-text-inverse)] text-sm font-bold">
                GIF
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--theme-text-secondary)]">
                  {selectedFile?.name.replace(/\.[^.]+$/, '')}.gif
                </p>
                <p className="text-xs text-[var(--theme-text-muted)]">{formatFileSize(gifSize)}</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-[var(--theme-bg-button-primary)] text-[var(--theme-text-inverse)] hover:bg-[var(--theme-bg-button-primary-hover)] active:bg-[var(--theme-bg-button-primary-active)] transition-colors"
            >
              <span>⬇</span>
              <span>下载 GIF</span>
            </button>
          </div>

          {/* GIF 预览 */}
          <div className="rounded-xl overflow-hidden border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] flex items-center justify-center p-4">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                backgroundImage:
                  'repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%) 0 0 / 16px 16px',
              }}
            >
              <img
                src={gifUrl}
                alt="转换结果 GIF"
                className="max-w-full max-h-[400px] object-contain block"
              />
            </div>
          </div>

          {/* 原始文件信息 */}
          {selectedFile && (
            <div className="text-xs text-[var(--theme-text-muted)] flex gap-4 px-1">
              <span>
                原始大小：<span className="text-[var(--theme-text-quaternary)]">{formatFileSize(selectedFile.size)}</span>
              </span>
              <span>
                GIF 大小：<span className="text-[var(--theme-text-quaternary)]">{formatFileSize(gifSize)}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
