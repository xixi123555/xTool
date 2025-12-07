import React from 'react';

interface IconProps {
  className?: string;
}

/**
 * 删除图标
 */
export function DeleteIcon({ className = '' }: IconProps) {
  // 检查是否包含尺寸类
  const hasSize = /h-[\d.]+|w-[\d.]+|h-full|w-full|h-screen|w-screen/.test(className);
  // 如果没有尺寸类，添加默认尺寸
  const finalClassName = hasSize ? className : `h-4 w-4 ${className}`.trim();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={finalClassName}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

/**
 * 编辑图标
 */
export function EditIcon({ className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className || 'h-3.5 w-3.5'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

/**
 * 添加/加号图标
 */
export function PlusIcon({ className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className || 'h-4 w-4'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

/**
 * 勾选图标
 */
export function CheckIcon({ className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className || 'h-full w-full'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

