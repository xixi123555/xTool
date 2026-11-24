import { clsx, type ClassValue } from 'clsx';

/** 合并条件类名，保持页面里 className 的可读性 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
