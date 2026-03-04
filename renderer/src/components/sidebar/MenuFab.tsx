import { useCallback, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useAppStore } from '../../store/useAppStore';

const FAB_POSITION_KEY = 'xtool_menu_fab_position';

function getStoredPosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(FAB_POSITION_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { x: number; y: number };
      if (typeof p.x === 'number' && typeof p.y === 'number') return p;
    }
  } catch (_) {}
  return { x: 0, y: 16 };
}

interface MenuFabProps {
  onClick: () => void;
}

/**
 * 悬浮按钮：有头像显示头像，无头像显示用户名（过长省略）。可拖动，位置持久化。
 */
export function MenuFab({ onClick }: MenuFabProps) {
  const user = useAppStore((s) => s.user);
  const [position, setPosition] = useState(getStoredPosition);
  const [mounted, setMounted] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStart = useCallback(() => {
    draggedRef.current = false;
  }, []);

  const handleStop = useCallback((_e: unknown, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y });
    localStorage.setItem(FAB_POSITION_KEY, JSON.stringify({ x: data.x, y: data.y }));
  }, []);

  const handleDrag = useCallback(() => {
    draggedRef.current = true;
  }, []);

  const displayName = user?.username ?? '';
  const showAvatar = Boolean(user?.avatar);
  const abbr =
    displayName.length > 2
      ? `${displayName.slice(0, 2)}…`
      : displayName || '?';

  if (!mounted) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="fixed left-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
        aria-label="打开菜单"
      >
        {showAvatar && user?.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium truncate max-w-[2em]">{abbr}</span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Draggable
          nodeRef={nodeRef}
          position={position}
          onStart={handleStart}
          onDrag={handleDrag}
          onStop={handleStop}
          bounds="parent"
        >
          <div
            ref={nodeRef}
            className="absolute left-4 top-4 cursor-grab active:cursor-grabbing pointer-events-auto"
            style={{ touchAction: 'manipulation' }}
          >
            <button
              type="button"
              onClick={() => {
                if (!draggedRef.current) onClick();
              }}
              onTouchEnd={(e) => {
                // 移动端：触摸结束时若未发生拖拽则打开菜单（click 在触摸设备上可能不触发）
                if (draggedRef.current) return;
                const touch = e.changedTouches?.[0];
                if (!touch) return;
                const target = e.currentTarget;
                const rect = target.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                  e.preventDefault();
                  onClick();
                }
              }}
              className="flex h-12 min-w-[3rem] max-w-[4rem] items-center justify-center rounded-full bg-white/90 shadow-lg border border-slate-200 text-slate-700 hover:bg-slate-50 px-3"
              aria-label="打开菜单"
            >
              {showAvatar && user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <span className="text-sm font-medium truncate">{abbr}</span>
              )}
            </button>
          </div>
        </Draggable>
      </div>
    </div>
  );
}
