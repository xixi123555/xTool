import React from 'react';

interface BookmarkIconProps {
  className?: string;
}

/**
 * 书签/固定图标
 */
export function BookmarkIcon({ className = '' }: BookmarkIconProps) {
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
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}

