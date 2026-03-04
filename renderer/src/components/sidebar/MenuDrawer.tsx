import { ReactNode } from 'react';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 左侧滑出的菜单抽屉（用于原侧边栏内容）
 */
export function MenuDrawer({ open, onClose, children }: MenuDrawerProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed left-0 top-0 h-full w-60 bg-white/80 backdrop-blur border-r border-slate-200 shadow-xl z-50 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  );
}
