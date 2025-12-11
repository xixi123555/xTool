import React, { useEffect, useRef, useState } from 'react';
import { useIpcEvent } from '../../hooks/useIpcEvent';

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
  const startRef = useRef<{ screenX: number; screenY: number; clientX: number; clientY: number; windowBounds: { x: number; y: number; width: number; height: number } } | null>(null);
  const [rect, setRect] = useState<Region | null>(null);
  const [displayRect, setDisplayRect] = useState<Region | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [windowBounds, setWindowBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setRect(null);
      setDisplayRect(null);
      startRef.current = null;
      setDragging(false);
      setCurrentMousePos(null);
      setWindowBounds(null);
      // 停止鼠标跟踪
      window.api.invoke('screenshot:stop-mouse-tracking').catch(console.error);
    } else {
      // 获取窗口边界
      window.api.invoke('screenshot:get-window-bounds').then((bounds) => {
        setWindowBounds(bounds as { x: number; y: number; width: number; height: number });
      }).catch(console.error);
      // 开始鼠标跟踪
      window.api.invoke('screenshot:start-mouse-tracking').catch(console.error);
    }
  }, [open]);
  
  // 辅助函数：更新显示矩形
  const updateDisplayRect = React.useCallback((globalRect: Region) => {
    // 计算全局选择框与当前窗口的交集部分
    const bounds = windowBounds || startRef.current?.windowBounds;
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      const windowEndX = bounds.x + bounds.width;
      const windowEndY = bounds.y + bounds.height;
      const rectEndX = globalRect.x + globalRect.width;
      const rectEndY = globalRect.y + globalRect.height;
      
      // 计算交集
      const intersectX = Math.max(globalRect.x, bounds.x);
      const intersectY = Math.max(globalRect.y, bounds.y);
      const intersectEndX = Math.min(rectEndX, windowEndX);
      const intersectEndY = Math.min(rectEndY, windowEndY);
      
      if (intersectX < intersectEndX && intersectY < intersectEndY) {
        // 有交集，转换为窗口内坐标
        const localX = intersectX - bounds.x;
        const localY = intersectY - bounds.y;
        const localWidth = intersectEndX - intersectX;
        const localHeight = intersectEndY - intersectY;
        setDisplayRect({ x: localX, y: localY, width: localWidth, height: localHeight });
      } else {
        // 无交集，不显示选择框
        setDisplayRect(null);
      }
    } else {
      // 如果没有窗口边界信息，不显示
      setDisplayRect(null);
    }
  }, [windowBounds]);

  // 监听全局鼠标位置更新
  useIpcEvent<{ x: number; y: number }>('screenshot:mouse-position', (pos) => {
    setCurrentMousePos(pos);
  });

  // 监听全局选择框更新（从其他窗口同步）
  useIpcEvent<Region | null>('screenshot:selection-rect', (rect) => {
    if (rect) {
      setRect(rect);
      // 计算与当前窗口的交集
      updateDisplayRect(rect);
    } else {
      setRect(null);
      setDisplayRect(null);
    }
  });

  useEffect(() => {
    async function onMouseDown(e: MouseEvent) {
      if (!open) return;
      // 获取窗口位置
      try {
        const bounds = (await window.api.invoke('screenshot:get-window-bounds')) as { x: number; y: number; width: number; height: number };
        setWindowBounds(bounds);
        // 保存屏幕坐标（用于截图）和窗口坐标（用于显示）
        startRef.current = { 
          screenX: e.screenX, 
          screenY: e.screenY, 
          clientX: e.clientX, 
          clientY: e.clientY,
          windowBounds: bounds || { x: 0, y: 0, width: 0, height: 0 }
        };
      } catch {
        // 如果获取窗口位置失败，使用默认值
        const defaultBounds = { x: 0, y: 0, width: 0, height: 0 };
        setWindowBounds(defaultBounds);
        startRef.current = { 
          screenX: e.screenX, 
          screenY: e.screenY, 
          clientX: e.clientX, 
          clientY: e.clientY,
          windowBounds: defaultBounds
        };
      }
      setDragging(true);
      // 屏幕坐标用于截图
      setRect({ x: e.screenX, y: e.screenY, width: 0, height: 0 });
      // 窗口坐标用于显示
      setDisplayRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
    }
    
    function onMouseMove(e: MouseEvent) {
      if (!open || !dragging || !startRef.current) return;
      updateRect(e.screenX, e.screenY, e.clientX, e.clientY);
    }
    
    function onMouseUp(e: MouseEvent) {
      if (!open) return;
      setDragging(false);
      // 清除全局选择框
      window.api.invoke('screenshot:update-selection', null).catch(console.error);
      if (rect && rect.width > 5 && rect.height > 5) {
        onConfirm(rect);
      } else {
        onCancel();
      }
    }
    
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        // 清除全局选择框
        window.api.invoke('screenshot:update-selection', null).catch(console.error);
        onCancel();
      }
    }

    function updateRect(screenX: number, screenY: number, clientX?: number, clientY?: number) {
      if (!startRef.current) return;
      
      // 屏幕坐标用于截图（全局选择框）
      const screenXMin = Math.min(startRef.current.screenX, screenX);
      const screenYMin = Math.min(startRef.current.screenY, screenY);
      const screenWidth = Math.abs(screenX - startRef.current.screenX);
      const screenHeight = Math.abs(screenY - startRef.current.screenY);
      const globalRect = { x: screenXMin, y: screenYMin, width: screenWidth, height: screenHeight };
      setRect(globalRect);
      
      // 更新全局选择框（广播给所有窗口）
      window.api.invoke('screenshot:update-selection', globalRect).catch(console.error);
      
      // 更新当前窗口的显示（使用回调函数）
      const bounds = windowBounds || startRef.current?.windowBounds;
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const windowEndX = bounds.x + bounds.width;
        const windowEndY = bounds.y + bounds.height;
        const rectEndX = globalRect.x + globalRect.width;
        const rectEndY = globalRect.y + globalRect.height;
        
        // 计算交集
        const intersectX = Math.max(globalRect.x, bounds.x);
        const intersectY = Math.max(globalRect.y, bounds.y);
        const intersectEndX = Math.min(rectEndX, windowEndX);
        const intersectEndY = Math.min(rectEndY, windowEndY);
        
        if (intersectX < intersectEndX && intersectY < intersectEndY) {
          // 有交集，转换为窗口内坐标
          const localX = intersectX - bounds.x;
          const localY = intersectY - bounds.y;
          const localWidth = intersectEndX - intersectX;
          const localHeight = intersectEndY - intersectY;
          setDisplayRect({ x: localX, y: localY, width: localWidth, height: localHeight });
        } else {
          // 无交集，不显示选择框
          setDisplayRect(null);
        }
      }
    }

    // 当全局鼠标位置更新时，如果正在拖拽，更新选择框
    if (dragging && currentMousePos && startRef.current) {
      updateRect(currentMousePos.x, currentMousePos.y);
    }

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, dragging, rect, currentMousePos, windowBounds, updateDisplayRect, onCancel, onConfirm]);

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
