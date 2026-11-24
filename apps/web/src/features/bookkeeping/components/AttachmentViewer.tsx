import type { BookkeepingAttachment, BookkeepingRecord } from '@xtool/shared';
import { Download, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from '../../../shared/lib/http';
import { formatFileSize } from '../../../shared/lib/format';
import { confirm, toast } from '../../../shared/store/feedback';
import { Spinner } from '../../../shared/ui/Page';
import { BottomSheet, Modal } from '../../../shared/ui/Overlay';
import { deleteAttachment, fetchAttachmentBlob, fetchAttachments } from '../api';

interface AttachmentViewerProps {
  open: boolean;
  mobile: boolean;
  record: BookkeepingRecord | null;
  currentUserId?: number;
  onClose: () => void;
  onChanged: () => void;
}

export function AttachmentViewer(props: AttachmentViewerProps) {
  const content = <AttachmentViewerContent {...props} />;
  return props.mobile ? (
    <BottomSheet
      open={props.open}
      onClose={props.onClose}
      title={props.record?.purpose ?? '附件'}
      description="图片与文件附件"
    >
      {content}
    </BottomSheet>
  ) : (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.record?.purpose ?? '附件'}
      description="图片与文件附件"
    >
      {content}
    </Modal>
  );
}

function AttachmentViewerContent({ record, currentUserId, onChanged }: AttachmentViewerProps) {
  const [attachments, setAttachments] = useState<BookkeepingAttachment[]>([]);
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({});
  const blobUrlsRef = useRef<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!record) return;
    setLoading(true);
    try {
      const result = await fetchAttachments(record.id);
      if (!result.success) throw new Error(result.error || '获取附件失败');
      setAttachments(result.attachments ?? []);
    } catch (error) {
      toast(errorMessage(error, '获取附件失败'), 'error');
    } finally {
      setLoading(false);
    }
  }, [record]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    attachments
      .filter(
        (attachment) =>
          attachment.mime_type.startsWith('image/') && !blobUrlsRef.current[attachment.id],
      )
      .forEach((attachment) => {
        fetchAttachmentBlob(attachment.id)
          .then((blob) => {
            if (cancelled) return;
            const url = URL.createObjectURL(blob);
            blobUrlsRef.current[attachment.id] = url;
            setBlobUrls((current) => ({ ...current, [attachment.id]: url }));
          })
          .catch(() => {
            // 单张图片预览失败不阻断其他附件展示
          });
      });

    return () => {
      cancelled = true;
    };
  }, [attachments]);

  useEffect(
    () => () => {
      Object.values(blobUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current = {};
    },
    [],
  );

  const handleDownload = async (attachment: BookkeepingAttachment) => {
    try {
      const blob = await fetchAttachmentBlob(attachment.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.original_name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (error) {
      toast(errorMessage(error, '下载失败'), 'error');
    }
  };

  const handleDelete = async (attachment: BookkeepingAttachment) => {
    const confirmed = await confirm({
      title: '删除附件',
      message: `确定删除「${attachment.original_name}」吗？`,
      confirmText: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const result = await deleteAttachment(attachment.id);
      if (!result.success) throw new Error(result.error || '删除失败');
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
      onChanged();
      toast('附件已删除', 'success');
    } catch (error) {
      toast(errorMessage(error, '删除失败'), 'error');
    }
  };

  if (loading) return <Spinner />;
  if (attachments.length === 0) {
    return <p className="py-8 text-center text-sm text-subtle">这笔记录还没有附件。</p>;
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => {
        const isImage = attachment.mime_type.startsWith('image/');
        return (
          <div key={attachment.id} className="overflow-hidden rounded-xl border border-line">
            {isImage && (
              <div className="flex min-h-28 items-center justify-center bg-muted">
                {blobUrls[attachment.id] ? (
                  <img
                    src={blobUrls[attachment.id]}
                    alt={attachment.original_name}
                    className="max-h-64 max-w-full object-contain"
                  />
                ) : (
                  <span className="py-8 text-xs text-subtle">图片加载中…</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2.5 bg-surface px-3 py-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-subtle">
                {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{attachment.original_name}</p>
                <p className="text-[11px] text-subtle">{formatFileSize(attachment.file_size)}</p>
              </div>
              <button
                type="button"
                className="btn-ghost h-8 w-8 p-0"
                onClick={() => void handleDownload(attachment)}
                aria-label="下载"
              >
                <Download className="h-4 w-4" />
              </button>
              {currentUserId === record?.user_id && (
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 p-0 hover:text-danger"
                  onClick={() => void handleDelete(attachment)}
                  aria-label="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
