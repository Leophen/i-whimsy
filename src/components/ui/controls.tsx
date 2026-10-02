'use client';

import * as React from 'react';
import {
  Checkbox as CheckboxPrimitive,
  Label as LabelPrimitive,
  RadioGroup as RadioGroupPrimitive,
  Select as SelectPrimitive,
  Separator as SeparatorPrimitive,
  Slider as SliderPrimitive,
  Switch as SwitchPrimitive,
  Tabs as TabsPrimitive,
} from 'radix-ui';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * Select — 面向工具面板封装：只需传 options
 * ------------------------------------------------------------------ */

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  contentClassName?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = '请选择',
  size = 'md',
  className,
  contentClassName,
  ariaLabel,
  disabled,
}: SelectProps) {
  const current = options.find((o) => o.value === value);
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background',
          'text-sm transition-colors duration-150 hover:border-border-strong',
          'focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:outline-none',
          'data-[placeholder]:text-subtle-foreground',
          'group',
          size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-10 px-3',
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder}>
          {current?.label ?? value}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg',
            'data-[state=open]:animate-scale-in',
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="scrollbar-none max-h-72 overflow-y-auto p-1.5">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={cn(
                  'relative flex cursor-pointer items-start gap-2 rounded-lg py-2 pr-8 pl-2.5 text-sm outline-none',
                  'transition-colors duration-100',
                  'data-[highlighted]:bg-primary-subtle data-[highlighted]:text-primary',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  {opt.description && (
                    <span className="mt-0.5 text-xs text-muted-foreground">{opt.description}</span>
                  )}
                </div>
                <SelectPrimitive.ItemIndicator className="absolute top-2 right-2.5">
                  <Check className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ *
 * SegmentedControl — 模式切换，工具页高频组件
 * ------------------------------------------------------------------ */

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  size?: 'sm' | 'md';
  className?: string;
  full?: boolean;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = 'md',
  className,
  full,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1 scrollbar-none',
        full ? 'w-full' : 'inline-flex',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150',
              'focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
              active
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Switch
 * ------------------------------------------------------------------ */
export function Switch({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-3',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-surface shadow-xs ring-0',
          'transition-transform duration-200 ease-out-expo',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

/** 带文字标签的开关行。 */
export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  className,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="min-w-0">
        <LabelPrimitive.Root htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </LabelPrimitive.Root>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Checkbox
 * ------------------------------------------------------------------ */
export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-4 shrink-0 rounded-[5px] border border-border-strong bg-background',
      'transition-colors duration-150 hover:border-primary',
      'focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="size-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

/** 勾选 + 标签，整行可点。 */
export function CheckboxRow({
  label,
  checked,
  onCheckedChange,
  className,
}: {
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <LabelPrimitive.Root htmlFor={id} className="cursor-pointer text-[13px] text-foreground">
        {label}
      </LabelPrimitive.Root>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Slider
 * ------------------------------------------------------------------ */
export const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none items-center select-none', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    {Array.from({ length: props.value?.length || 1 }).map((_, i) => (
      <SliderPrimitive.Thumb
        key={i}
        className={cn(
          'block size-4 rounded-full border-2 border-primary bg-surface shadow-sm',
          'transition-transform duration-150 hover:scale-110',
          'focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
        )}
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';

/** 带数值显示的滑杆行。 */
export function SliderRow({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix,
  className,
}: {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="tabular text-xs font-medium text-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * RadioGroup
 * ------------------------------------------------------------------ */
export function RadioGroup({
  options,
  value,
  onValueChange,
  name,
  className,
}: {
  options: { value: string; label: React.ReactNode; description?: string }[];
  value: string;
  onValueChange: (v: string) => void;
  name?: string;
  className?: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      className={cn('flex flex-wrap gap-2', className)}
      {...(name ? { name } : {})}
    >
      {options.map((opt) => (
        <RadioGroupPrimitive.Item
          key={opt.value}
          value={opt.value}
          className={cn(
            'group inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-[13px]',
            'transition-all duration-150 hover:border-border-strong',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary-subtle data-[state=checked]:text-primary',
            'focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
          )}
        >
          <span className="grid size-3.5 place-items-center rounded-full border border-border-strong group-data-[state=checked]:border-primary">
            <span className="size-1.5 rounded-full bg-transparent group-data-[state=checked]:bg-primary" />
          </span>
          <span className="font-medium">{opt.label}</span>
          {opt.description && (
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          )}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */
export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground',
      'transition-all duration-150 focus-visible:outline-none',
      'hover:text-foreground',
      'data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-xs',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

/* ------------------------------------------------------------------ *
 * Separator
 * ------------------------------------------------------------------ */
export function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}
