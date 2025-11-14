import React, { useRef, useState } from 'react';

export function DraggableScreenshot({ src, onRemove }: { src: string; onRemove: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const draggingRef = useRef<{ dx: number; dy: number } | null>(null);

  function onMouseDown(e: React.MouseEvent) {
    draggingRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
  function onMouseMove(e: MouseEvent) {
    if (!draggingRef.current) return;
    setPos({ x: e.clientX - draggingRef.current.dx, y: e.clientY - draggingRef.current.dy });
  }
  function onMouseUp() {
    draggingRef.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  return (
    <div
      ref={ref}
      className="fixed z-40 shadow-xl rounded-md bg-white overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: 240 }}
    >
      <div className="flex items-center justify-between p-2 bg-slate-900/80 text-white cursor-move" onMouseDown={onMouseDown}>
        <span className="text-xs">截图</span>
        <div className="flex gap-2">
          <button className="text-xs" onClick={onRemove}>撤回</button>
        </div>
      </div>
      <img src={src} alt="screenshot" className="w-full h-auto block" />
    </div>
  );
}
