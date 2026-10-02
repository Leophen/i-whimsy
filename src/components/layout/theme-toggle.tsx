'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'dark', label: '深色', icon: Moon },
] as const;

type ThemeValue = (typeof OPTIONS)[number]['value'];

/** 与 Providers 里 defaultTheme="system" 保持一致，SSR / hydration 前占位用。 */
const SSR_PLACEHOLDER_THEME: ThemeValue = 'system';

/**
 * 主题切换 —— 必须用 mounted 门控，不能用 useHydrated。
 * useSyncExternalStore 在客户端首帧就返回 true，会与 SSR（false）立刻产生 hydration 不一致。
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // 故意在 effect 里 setMounted：首帧须与 SSR 同为 false，useHydrated 做不到。
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration 门控，next-themes 官方同款写法
    setMounted(true);
  }, []);

  const activeTheme: ThemeValue = mounted ? ((theme as ThemeValue | undefined) ?? 'system') : SSR_PLACEHOLDER_THEME;

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
        const active = activeTheme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              'grid size-7 place-items-center rounded-[6px] transition-all duration-150',
              active
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
              !mounted && 'pointer-events-none',
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
