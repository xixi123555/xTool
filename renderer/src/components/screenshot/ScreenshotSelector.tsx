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
  const startRef = useRef<{ screenX: number; screenY: number; clientX: number; clientY: number } | null>(null);
  const [rect, setRect] = useState<Region | null>(null);
  const [displayRect, setDisplayRect] = useState<Region | null>(null);

  useEffect(() => {
    if (!open) {
      setRect(null);
      setDisplayRect(null);
      startRef.current = null;
      setDragging(false);
    }
  }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!open) return;
      // 保存屏幕坐标（用于截图）和窗口坐标（用于显示）
      startRef.current = { screenX: e.screenX, screenY: e.screenY, clientX: e.clientX, clientY: e.clientY };
      setDragging(true);
      // 屏幕坐标用于截图
      setRect({ x: e.screenX, y: e.screenY, width: 0, height: 0 });
      // 窗口坐标用于显示
      setDisplayRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    }
    function onMouseMove(e: MouseEvent) {
      if (!open || !dragging || !startRef.current) return;
      // 屏幕坐标用于截图
      const screenX = Math.min(startRef.current.screenX, e.screenX);
      const screenY = Math.min(startRef.current.screenY, e.screenY);
      const screenWidth = Math.abs(e.screenX - startRef.current.screenX);
      const screenHeight = Math.abs(e.screenY - startRef.current.screenY);
      setRect({ x: screenX, y: screenY, width: screenWidth, height: screenHeight });
      
      // 窗口坐标用于显示
      const clientX = Math.min(startRef.current.clientX, e.clientX);
      const clientY = Math.min(startRef.current.clientY, e.clientY);
      const clientWidth = Math.abs(e.clientX - startRef.current.clientX);
      const clientHeight = Math.abs(e.clientY - startRef.current.clientY);
      setDisplayRect({ x: clientX, y: clientY, width: clientWidth, height: clientHeight });
    }
    function onMouseUp(e: MouseEvent) {
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
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-black/10">
      {/* 绿色边框标记整个可截图区域 */}
      <div className="absolute inset-0 border-4 border-green-500 pointer-events-none" />
      {displayRect && (
        <div
          style={{ left: displayRect.x, top: displayRect.y, width: displayRect.width, height: displayRect.height }}
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
        />
      )}
    </div>
  );
}
