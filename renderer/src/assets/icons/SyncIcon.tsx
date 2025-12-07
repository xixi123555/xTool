import React from 'react';

interface SyncIconProps {
  spinning?: boolean;
  className?: string;
}

/**
 * 同步图标
 * @param spinning - 是否显示旋转动画
 * @param className - 额外的样式类
 */
export function SyncIcon({ spinning = false, className = '' }: SyncIconProps) {
  // 检查是否包含尺寸类
  const hasSize = /h-[\d.]+|w-[\d.]+|h-full|w-full|h-screen|w-screen/.test(className);
  // 如果没有尺寸类，添加默认尺寸
  const baseSize = hasSize ? '' : 'h-4 w-4';
  const spinClass = spinning ? 'animate-spin' : '';
  const finalClassName = `${baseSize} ${className} ${spinClass}`.trim();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={finalClassName}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

