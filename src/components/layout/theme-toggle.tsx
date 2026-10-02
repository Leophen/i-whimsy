'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { useHydrated } from '@/lib/hooks';

const OPTIONS = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'dark', label: '深色', icon: Moon },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const current = hydrated ? theme : undefined;

  return (
    <div
      role="radiogroup"
      aria-label="切换主题"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = current === value;
        const ariaLabel = label;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={ariaLabel}
            onClick={() => setTheme(value)}
            className={cn(
              'grid size-7 place-items-center rounded-[6px] transition-all duration-150',
              active
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
      {/* 供 SSR 之前保留一个不可见的占位，避免布局跳动 */}
      <span className="sr-only">{resolvedTheme ?? ''}</span>
    </div>
  );
}
