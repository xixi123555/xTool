import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../lib/cn';

function useOverlayBehavior(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** 桌面端居中弹窗；移动端建议用 BottomSheet */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: OverlayProps) {
  useOverlayBehavior(open, onClose);
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'card flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden animate-fade-in',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-1 text-xs text-subtle">{description}</p>}
          </div>
          <button
            type="button"
            className="btn-ghost -mr-2 h-8 w-8 p-0"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-8 pt-4">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/** 移动端底部抽屉 */
export function BottomSheet({ open, onClose, title, description, children, footer }: OverlayProps) {
  useOverlayBehavior(open, onClose);
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-sm md:hidden"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface animate-sheet-up">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
            {description && <p className="mt-1 text-xs text-subtle">{description}</p>}
          </div>
          <button
            type="button"
            className="btn-ghost h-8 w-8 p-0"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-8 pt-4">{children}</div>
        {footer && <footer className="safe-bottom border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
