'use client';

import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Label
 * ------------------------------------------------------------------ */
export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-[13px] leading-none font-medium text-foreground/90 peer-disabled:opacity-60',
      className,
    )}
    {...props}
  />
));
Label.displayName = 'Label';

/* ------------------------------------------------------------------ *
 * Field — 标签 + 控件 + 描述/错误，工具面板统一使用
 * ------------------------------------------------------------------ */
export interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, error, action, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-3">
          {label && (
            <Label
              htmlFor={htmlFor}
              className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
            >
              {label}
            </Label>
          )}
          {action}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Input
 * ------------------------------------------------------------------ */
export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      data-slot="input"
      className={cn(
        'h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm',
        'placeholder:text-subtle-foreground/70',
        'transition-colors duration-150',
        'hover:border-border-strong',
        'focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

/* ------------------------------------------------------------------ *
 * Textarea
 * ------------------------------------------------------------------ */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<'textarea'>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-slot="textarea"
    className={cn(
      'min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed',
      'placeholder:text-subtle-foreground/70',
      'transition-colors duration-150',
      'hover:border-border-strong',
      'focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:outline-none',
      'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/20',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
