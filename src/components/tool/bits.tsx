'use client';

import * as React from 'react';
import { Check, Copy, Download, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyToClipboard, downloadFile } from '@/lib/core/browser';

/* ------------------------------------------------------------------ *
 * CopyButton
 * ------------------------------------------------------------------ */
export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'value'> {
  value: string | (() => string);
  copiedLabel?: string;
  silent?: boolean;
  sourceLabel?: string;
}

export function CopyButton({
  value,
  children,
  copiedLabel = '已复制',
  silent = false,
  sourceLabel = '内容',
  variant = 'secondary',
  size = 'sm',
  className,
  disabled,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleCopy = async () => {
    const text = typeof value === 'function' ? value() : value;
    if (!text) {
      if (!silent) toast.error(`${sourceLabel}为空，没有可复制的内容`);
      return;
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      if (!silent) toast.success(`${sourceLabel}已复制到剪贴板`);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } else {
      if (!silent) toast.error('复制失败，请手动选择复制');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      disabled={disabled}
      className={cn('transition-colors', copied && 'border-success/40 text-success', className)}
      aria-label={typeof children === 'string' ? `复制${children}` : '复制'}
      {...props}
    >
      {copied ? <Check /> : <Copy />}
      {children ?? (copied ? copiedLabel : '复制')}
    </Button>
  );
}

/** 图标型复制按钮，适合放在输入框内。 */
export function CopyIconButton({
  value,
  sourceLabel,
  className,
}: {
  value: string | (() => string);
  sourceLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const text = typeof value === 'function' ? value() : value;
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`复制${sourceLabel ?? '内容'}`}
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground',
        'transition-colors hover:bg-surface-2 hover:text-foreground',
        copied && 'text-success',
        className,
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * DownloadButton
 * ------------------------------------------------------------------ */
export interface DownloadButtonProps extends Omit<ButtonProps, 'onClick'> {
  data: Blob | string | null;
  filename: string;
  mimeType?: string;
  sourceLabel?: string;
}

export function DownloadButton({
  data,
  filename,
  mimeType,
  sourceLabel = '文件',
  children,
  variant = 'primary',
  size = 'sm',
  disabled,
  className,
  ...props
}: DownloadButtonProps) {
  const handleDownload = () => {
    if (!data) {
      toast.error(`还没有可下载的${sourceLabel}`);
      return;
    }
    downloadFile(data, filename, mimeType);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={disabled || !data}
      className={className}
      {...props}
    >
      <Download />
      {children ?? '下载'}
    </Button>
  );
}

/* ------------------------------------------------------------------ *
 * ResetButton
 * ------------------------------------------------------------------ */
export function ResetButton({
  onReset,
  className,
  size = 'sm',
}: {
  onReset: () => void;
  className?: string;
  size?: ButtonProps['size'];
}) {
  return (
    <Button variant="ghost" size={size} onClick={onReset} className={className}>
      <RotateCcw />
      重置
    </Button>
  );
}

export function ClearButton({
  onClear,
  className,
  size = 'sm',
  label = '清空',
}: {
  onClear: () => void;
  className?: string;
  size?: ButtonProps['size'];
  label?: string;
}) {
  return (
    <Button variant="ghost" size={size} onClick={onClear} className={className}>
      <Trash2 />
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ *
 * Stat — 指标展示（工具页里高频使用）
 * ------------------------------------------------------------------ */
export interface StatItem {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const TONE_CLASS: Record<NonNullable<StatItem['tone']>, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function Stat({ label, value, hint, tone = 'default' }: StatItem) {
  return (
    <div className="rounded-xl border border-border bg-background px-3.5 py-3">
      <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className={cn('tabular mt-1 text-xl leading-tight font-semibold', TONE_CLASS[tone])}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatGrid({
  items,
  columns = 4,
  className,
}: {
  items: StatItem[];
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const cols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
    6: 'sm:grid-cols-3 lg:grid-cols-6',
  }[columns];
  return (
    <div className={cn('grid grid-cols-2 gap-2.5', cols, className)}>
      {items.map((item, i) => (
        <Stat key={i} {...item} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * BusyOverlay — 处理中的遮罩（图片类工具的重计算）
 * ------------------------------------------------------------------ */
export function BusyOverlay({ show, label = '处理中…' }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-surface/60 backdrop-blur-[2px]">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs shadow-sm">
        <Loader2 className="size-3.5 animate-spin text-primary" />
        {label}
      </div>
    </div>
  );
}
