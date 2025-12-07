import React from 'react';

interface StarIconProps {
  filled?: boolean;
  className?: string;
}

/**
 * 星星图标
 * @param filled - 是否填充（已标星）
 * @param className - 额外的样式类
 */
export function StarIcon({ filled = false, className = '' }: StarIconProps) {
  const baseSize = className ? '' : 'h-5 w-5';
  const filledClasses = `${baseSize} text-amber-500 fill-current ${className}`.trim();
  const outlineClasses = `${baseSize} text-slate-400 fill-none stroke-current ${className}`.trim();
  
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={filledClasses}
        viewBox="0 0 24 24"
      >
        <path
          d="M12 2.5L14.25 8.5L20.5 9.25L16 13.25L17.25 19.5L12 16.5L6.75 19.5L8 13.25L3.5 9.25L9.75 8.5L12 2.5Z"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={outlineClasses}
      viewBox="0 0 24 24"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      />
    </svg>
  );
}

