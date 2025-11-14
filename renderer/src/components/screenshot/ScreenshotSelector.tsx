import React, { useEffect, useRef, useState } from 'react';

type Region = { x: number; y: number; width: number; height: number };

export function ScreenshotSelector({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: (region: Region) => void;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Region | null>(null);

  useEffect(() => {
    if (!open) {
      setRect(null);
      startRef.current = null;
      setDragging(false);
    }
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!open) return;
      startRef.current = { x: e.clientX, y: e.clientY };
      setDragging(true);
      setRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    }
    function onMouseMove(e: MouseEvent) {
      if (!open || !dragging || !startRef.current) return;
      const sx = startRef.current.x;
      const sy = startRef.current.y;
      const x = Math.min(sx, e.clientX);
      const y = Math.min(sy, e.clientY);
      const width = Math.abs(e.clientX - sx);
      const height = Math.abs(e.clientY - sy);
      setRect({ x, y, width, height });
    }
    function onMouseUp() {
      if (!open) return;
      setDragging(false);
      if (rect && rect.width > 5 && rect.height > 5) {
        onConfirm(rect);
      } else {
        onCancel();
      }
    }

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [open, dragging, rect, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      {rect && (
        <div
          style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          className="absolute border-2 border-dashed border-white/90 bg-white/10"
        />
      )}
    </div>
  );
}
