import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        onCancel();
      }
      if (ev.key === 'Enter' && !ev.shiftKey) {
        onConfirm();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onCancel, onConfirm]);

  const confirmButtonClass =
    variant === 'danger'
      ? 'px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
      : 'px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

  if (!open) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-dialog-title' : undefined}
      aria-describedby="confirm-dialog-message"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900 mb-3">
            {title}
          </h3>
        )}
        <p id="confirm-dialog-message" className="text-sm text-slate-600 mb-6">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmButtonClass}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

