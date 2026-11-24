import { Search } from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';

import { cn } from '../lib/cn';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  size = 'md',
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex rounded-xl border border-line bg-muted p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-medium transition',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'bg-surface text-fg shadow-sm' : 'text-subtle hover:text-fg',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('relative block', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
      <input
        type="search"
        className="field pl-9"
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </label>
  );
}

export function Avatar({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dimension =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm';
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? '头像'}
        className={cn('flex-shrink-0 rounded-full object-cover', dimension)}
      />
    );
  }
  return (
    <span
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent',
        dimension,
      )}
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'danger' | 'success' | 'warning';
}) {
  const toneClass = {
    default: 'bg-muted text-subtle',
    accent: 'bg-accent-soft text-accent',
    danger: 'bg-danger-soft text-danger',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        toneClass,
      )}
    >
      {children}
    </span>
  );
}
