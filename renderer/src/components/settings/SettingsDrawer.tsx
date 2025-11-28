import { ReactNode } from 'react';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function SettingsDrawer({ open, onClose, children }: SettingsDrawerProps) {
  return (
    <>
      {/* 遮罩层 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* 抽屉 */}
      <div
        className={`fixed left-0 top-0 h-full w-[80%] bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  );
}

