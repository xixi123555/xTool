import type { ReactNode } from 'react';

import { cn } from '../lib/cn';

interface PageProps {
  children: ReactNode;
  className?: string;
}

/** 页面统一容器：桌面留白更大，移动端给底部导航预留空间 */
export function Page({ children, className }: PageProps) {
  return (
    <div
      className={cn(
        'mx-auto h-full w-full max-w-6xl overflow-y-auto px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-subtle">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-fg md:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionCard({
  children,
  className,
  title,
  description,
  actions,
}: SectionCardProps) {
  return (
    <section className={cn('card p-4 md:p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {description && <p className="mt-1 text-xs text-subtle">{description}</p>}
          </div>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-subtle">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-subtle">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-10', className)}>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}

export function PageLoading() {
  return <Spinner className="py-24" />;
}
