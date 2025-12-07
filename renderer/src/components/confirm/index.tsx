import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ConfirmDialog } from './ConfirmDialog';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
};

/**
 * 显示确认对话框
 * @param options 对话框配置选项
 * @returns Promise<boolean> 用户点击确定返回true，取消返回false
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    container.id = `confirm-dialog-${Date.now()}`;
    document.body.appendChild(container);

    let isResolved = false;
    let root: ReactDOM.Root;

    const cleanup = () => {
      if (root) {
        root.unmount();
      }
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };

    const ConfirmWrapper = () => {
      const [open, setOpen] = useState(true);

      const handleConfirm = () => {
        if (isResolved) return;
        isResolved = true;
        setOpen(false);
        // 等待动画完成后清理并resolve
        setTimeout(() => {
          cleanup();
          resolve(true);
        }, 200);
      };

      const handleCancel = () => {
        if (isResolved) return;
        isResolved = true;
        setOpen(false);
        // 等待动画完成后清理并resolve
        setTimeout(() => {
          cleanup();
          resolve(false);
        }, 200);
      };

      return (
        <ConfirmDialog
          open={open}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
    };

    root = ReactDOM.createRoot(container);
    root.render(<ConfirmWrapper />);
  });
}

export { ConfirmDialog } from './ConfirmDialog';

