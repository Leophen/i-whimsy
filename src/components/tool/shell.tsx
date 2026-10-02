'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * ToolShell — 每个工具页的统一外壳
 * 结构：标题区（图标/标题/描述/操作） + 内容区 + 可选页脚
 * ------------------------------------------------------------------ */
export interface ToolShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function ToolShell({
  title,
  description,
  icon,
  actions,
  badges,
  footer,
  className,
  children,
}: ToolShellProps) {
  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {icon && (
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface shadow-xs [&_svg]:size-5">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl leading-tight font-semibold tracking-tight sm:text-[26px]">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
            {badges && <div className="mt-2.5 flex flex-wrap gap-1.5">{badges}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>

      <div className="flex flex-col gap-4">{children}</div>

      {footer && <footer className="mt-1">{footer}</footer>}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Panel — 内嵌区块（带可选标题与操作）
 * ------------------------------------------------------------------ */
export interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  children: React.ReactNode;
}

export function Panel({
  title,
  description,
  actions,
  className,
  bodyClassName,
  padded = true,
  children,
}: PanelProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-surface shadow-sm',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
            )}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn(padded && 'p-4', bodyClassName)}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ToolIO — 输入 / 输出双栏（宽屏并排，窄屏堆叠）
 * ------------------------------------------------------------------ */
export interface ToolIOProps {
  input: React.ReactNode;
  output: React.ReactNode;
  /** 输入区宽度占比 */
  split?: 'even' | 'wide-input' | 'wide-output';
  className?: string;
  stacked?: boolean;
}

export function ToolIO({ input, output, split = 'even', className, stacked = false }: ToolIOProps) {
  if (stacked) {
    return <div className={cn('flex flex-col gap-4', className)}>{[input, output]}</div>;
  }
  const cols = {
    even: 'lg:grid-cols-2',
    'wide-input': 'lg:grid-cols-[1.35fr_1fr]',
    'wide-output': 'lg:grid-cols-[1fr_1.35fr]',
  }[split];
  return (
    <div className={cn('grid grid-cols-1 gap-4', cols, className)}>
      {input}
      {output}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * EmptyState
 * ------------------------------------------------------------------ */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="grid size-11 place-items-center rounded-full border border-border bg-surface-2 text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Notice — 提示条
 * ------------------------------------------------------------------ */
export function Notice({
  tone = 'info',
  children,
  className,
  icon,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  const toneClass = {
    info: 'border-border bg-surface-2 text-muted-foreground',
    success: 'border-success/25 bg-success-subtle text-success',
    warning: 'border-warning/25 bg-warning-subtle text-warning',
    danger: 'border-danger/25 bg-danger-subtle text-danger',
  }[tone];
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed',
        toneClass,
        className,
      )}
    >
      {icon && <span className="mt-px shrink-0 [&_svg]:size-3.5">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
