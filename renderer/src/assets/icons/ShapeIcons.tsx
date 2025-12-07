import React from 'react';

interface IconProps {
  className?: string;
}

/**
 * 矩形图标
 */
export function RectangleIcon({ className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className || 'h-5 w-5'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
      />
    </svg>
  );
}

/**
 * 圆形/椭圆图标
 */
export function CircleIcon({ className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className || 'h-5 w-5'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

