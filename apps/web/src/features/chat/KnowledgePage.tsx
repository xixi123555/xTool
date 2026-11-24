import { BookOpen, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { errorMessage } from '../../shared/lib/http';
import { formatFileSize } from '../../shared/lib/format';
import { toast } from '../../shared/store/feedback';
import { Page, PageHeader } from '../../shared/ui/Page';
import { ingestFile, ingestText, uploadChatFile } from './api';

export function KnowledgePage() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [savingText, setSavingText] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleText = async () => {
    if (!text.trim() || savingText) return;
    setSavingText(true);
    try {
      await ingestText({ text: text.trim(), title: title.trim() || undefined });
      setText('');
      setTitle('');
      toast('文本已入库', 'success');
    } catch (error) {
      toast(errorMessage(error, '文本入库失败'), 'error');
    } finally {
      setSavingText(false);
    }
  };

  const handleFiles = async () => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    let succeeded = 0;
    for (const file of files) {
      try {
        const uploaded = await uploadChatFile(file);
        if (!uploaded) continue;
        await ingestFile({
          url: uploaded.url,
          name: uploaded.name,
          mime_type: uploaded.mime_type,
          size: uploaded.size,
        });
        succeeded += 1;
      } catch (error) {
        toast(`${file.name} 入库失败：${errorMessage(error)}`, 'error');
      }
    }
    setUploading(false);
    if (succeeded > 0) {
      setFiles([]);
      toast(`${succeeded} 个文件已入库`, 'success');
    }
  };

  return (
    <Page>
      <PageHeader title="知识库" description="把文字或文件加入公共知识库，机器人回答时会引用。" />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <p className="section-title">文本入库</p>
              <p className="text-xs text-subtle">适合粘贴说明、FAQ、会议纪要</p>
            </div>
          </div>

          <input
            className="field mb-2"
            placeholder="标题（可选）"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="field min-h-48 resize-y"
            placeholder="粘贴要入库的文本…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => void handleText()}
            disabled={!text.trim() || savingText}
          >
            {savingText ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            保存到知识库
          </button>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <UploadCloud className="h-4 w-4" />
            </span>
            <div>
              <p className="section-title">文件入库</p>
              <p className="text-xs text-subtle">支持图片、PDF、Word、表格与文本</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line px-4 py-8 text-center transition hover:border-accent/50"
          >
            <UploadCloud className="h-7 w-7 text-subtle" />
            <span className="mt-2 text-sm font-medium text-fg">点击选择文件</span>
            <span className="mt-1 text-xs text-subtle">可以一次选择多个</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              if (picked.length > 0) setFiles((current) => [...current, ...picked]);
              event.target.value = '';
            }}
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 flex-shrink-0 text-subtle" />
                  <span className="min-w-0 flex-1 truncate text-fg">{file.name}</span>
                  <span className="flex-shrink-0 text-subtle">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    className="text-subtle hover:text-danger"
                    onClick={() =>
                      setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    aria-label="移除"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => void handleFiles()}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            {uploading ? '正在入库…' : `上传 ${files.length || ''} 个文件`}
          </button>
        </section>
      </div>
    </Page>
  );
}
