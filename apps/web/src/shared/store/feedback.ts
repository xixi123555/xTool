/**
 * 轻量全局反馈：toast 与 confirm。
 *
 * 不依赖 React Context，任何 API 层/事件回调都能直接调用；
 * 视图由 <FeedbackHost /> 统一挂载，避免每次调用都 new 一个 ReactDOM root。
 */
import { useSyncExternalStore } from 'react';

type ToastVariant = 'default' | 'success' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

let toastId = 0;
let toasts: ToastItem[] = [];
let lastToast = { message: '', at: 0 };
const toastListeners = new Set<() => void>();

function emitToasts(): void {
  toastListeners.forEach((listener) => listener());
}

export function toast(message: string, variant: ToastVariant = 'default', duration = 2200): void {
  const now = Date.now();
  // StrictMode 下同一请求可能触发两次，1 秒内相同文案只展示一次
  if (message === lastToast.message && now - lastToast.at < 1000) return;
  lastToast = { message, at: now };

  const item: ToastItem = { id: ++toastId, message, variant };
  toasts = [...toasts, item];
  emitToasts();
  window.setTimeout(() => {
    toasts = toasts.filter((entry) => entry.id !== item.id);
    emitToasts();
  }, duration);
}

let pendingConfirm: PendingConfirm | null = null;
const confirmListeners = new Set<() => void>();

function emitConfirm(): void {
  confirmListeners.forEach((listener) => listener());
}

export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    pendingConfirm = { options, resolve };
    emitConfirm();
  });
}

export function resolveConfirm(value: boolean): void {
  pendingConfirm?.resolve(value);
  pendingConfirm = null;
  emitConfirm();
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (listener) => {
      toastListeners.add(listener);
      return () => toastListeners.delete(listener);
    },
    () => toasts,
    () => [],
  );
}

export function usePendingConfirm(): PendingConfirm | null {
  return useSyncExternalStore(
    (listener) => {
      confirmListeners.add(listener);
      return () => confirmListeners.delete(listener);
    },
    () => pendingConfirm,
    () => null,
  );
}
