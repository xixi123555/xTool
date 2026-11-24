import { CheckCircle2, XCircle } from 'lucide-react';

import { cn } from '../lib/cn';
import { resolveConfirm, usePendingConfirm, useToasts } from '../store/feedback';
import { Modal } from './Overlay';

/** 全局 toast 与 confirm 的挂载点，App 根部渲染一次即可 */
export function FeedbackHost() {
  const toasts = useToasts();
  const pending = usePendingConfirm();

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-3.5 py-2 text-sm shadow-pop animate-fade-in',
              item.variant === 'error'
                ? 'bg-danger text-white'
                : item.variant === 'success'
                  ? 'bg-success text-white'
                  : 'bg-fg text-canvas',
            )}
          >
            {item.variant === 'success' && <CheckCircle2 className="h-4 w-4" />}
            {item.variant === 'error' && <XCircle className="h-4 w-4" />}
            <span>{item.message}</span>
          </div>
        ))}
      </div>

      <Modal
        open={Boolean(pending)}
        onClose={() => resolveConfirm(false)}
        title={pending?.options.title ?? '确认操作'}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => resolveConfirm(false)}>
              {pending?.options.cancelText ?? '取消'}
            </button>
            <button
              type="button"
              className={pending?.options.variant === 'danger' ? 'btn-danger' : 'btn-primary'}
              onClick={() => resolveConfirm(true)}
            >
              {pending?.options.confirmText ?? '确定'}
            </button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-subtle">{pending?.options.message}</p>
      </Modal>
    </>
  );
}
