import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ImagePreviewOverlayProps = {
  open: boolean;
  src: string;
  onConfirm: () => void;
  onCancel: () => void;
  hintText?: string;
};

export function ImagePreviewOverlay({ open, src, onConfirm, onCancel, hintText = '点击空白区域确认复制到剪贴板' }: ImagePreviewOverlayProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onCancel();
      if (ev.key === 'Enter') onConfirm();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
      onClick={onConfirm}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-w-[80vw] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="preview" className="rounded-xl shadow-2xl object-contain max-w-full max-h-[80vh]" />
        <div className="absolute -top-10 left-0 right-0 text-center text-sm text-white/80">
          {hintText}
        </div>
        <button
          className="absolute -top-12 right-0 text-xs text-white/80 hover:text-white underline"
          onClick={onCancel}
        >
          取消(Esc)
        </button>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
