import React from 'react';
import { DeleteIcon } from '../../assets/icons';

export interface ClosableTagProps {
  /** 标签文字 */
  children: React.ReactNode;
  /** 是否选中 */
  selected?: boolean;
  /** 点击标签主体时 */
  onSelect?: () => void;
  /** 点击删除图标时（由父组件弹确认框后执行删除） */
  onClose?: () => void;
  /** 是否显示「默认」角标 */
  isDefault?: boolean;
  /** 非默认时，点击「设为默认」回调 */
  onSetDefault?: () => void;
  className?: string;
}

/**
 * 类似 antd Tag：可选中，末尾带删除图标，点击删除由父组件负责确认
 */
export function ClosableTag({
  children,
  selected,
  onSelect,
  onClose,
  isDefault,
  onSetDefault,
  className = '',
}: ClosableTagProps) {
  const base =
    'inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm transition ' +
    (selected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200');

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-closable-tag-close]') || target.closest('[data-closable-tag-set-default]')) return;
        onSelect?.();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const target = e.target as HTMLElement;
          if (!target.closest('[data-closable-tag-close]') && !target.closest('[data-closable-tag-set-default]')) {
            e.preventDefault();
            onSelect?.();
          }
        }
      }}
      className={`${base} ${className}`}
    >
      <span>{children}</span>
      {isDefault ? (
        <span className="ml-0.5 text-[10px] opacity-80">默认</span>
      ) : onSetDefault ? (
        <button
          type="button"
          data-closable-tag-set-default
          onClick={(e) => {
            e.stopPropagation();
            onSetDefault();
          }}
          className="ml-0.5 text-[10px] text-slate-500 hover:text-slate-700 underline"
        >
          设为默认
        </button>
      ) : null}
      {onClose ? (
        <span
          role="button"
          tabIndex={0}
          data-closable-tag-close
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }
          }}
          className="ml-1 inline-flex items-center opacity-70 hover:opacity-100 focus:outline-none"
          aria-label="删除"
        >
          <DeleteIcon className="h-3.5 w-3.5" />
        </span>
      ) : null}
    </span>
  );
}
