'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  className?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

/** 图像前后对比拖动条 —— 抠图、修复、LUT 等工具共用。 */
export function CompareSlider({
  beforeUrl,
  afterUrl,
  className,
  beforeLabel = '原图',
  afterLabel = '结果',
}: CompareSliderProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState(50);
  const dragging = React.useRef(false);

  const clampPosition = (pct: number) => Math.min(98, Math.max(2, pct));

  const updateFromClientX = React.useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(clampPosition(pct));
  }, []);

  const nudge = React.useCallback((delta: number) => {
    setPosition((p) => clampPosition(p + delta));
  }, []);

  const rounded = Math.round(position);

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[4/3] w-full min-w-0 overflow-hidden rounded-xl border border-border',
        className,
      )}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-compare-handle]')) return;
        dragging.current = true;
        updateFromClientX(e.clientX);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL 对比预览 */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 size-full object-contain bg-[length:16px_16px] bg-[position:0_0,8px_8px] bg-[image:linear-gradient(45deg,var(--color-surface-3)_25%,transparent_25%,transparent_75%,var(--color-surface-3)_75%,var(--color-surface-3)),linear-gradient(45deg,var(--color-surface-3)_25%,transparent_25%,transparent_75%,var(--color-surface-3)_75%,var(--color-surface-3))]"
        draggable={false}
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URL 对比预览 */}
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="size-full object-contain bg-surface-2"
          draggable={false}
        />
      </div>
      <div
        className="absolute inset-y-0 z-10 -translate-x-1/2"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-foreground/90 shadow-md" />
        <div
          data-compare-handle
          role="slider"
          tabIndex={0}
          aria-label="前后对比位置"
          aria-valuemin={2}
          aria-valuemax={98}
          aria-valuenow={rounded}
          aria-valuetext={`${beforeLabel} ${rounded}% · ${afterLabel} ${100 - rounded}%`}
          className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-foreground/20 bg-surface/90 text-foreground shadow-sm backdrop-blur-sm focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none"
          onPointerDown={(e) => {
            e.stopPropagation();
            dragging.current = true;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              nudge(-2);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              nudge(2);
            }
          }}
        >
          <span className="text-[10px] font-bold" aria-hidden>⟷</span>
        </div>
      </div>
      <span className="absolute top-2 left-2 max-w-[45%] truncate rounded-full bg-foreground/75 px-2 py-0.5 text-[10px] text-background">
        {beforeLabel}
      </span>
      <span className="absolute top-2 right-2 max-w-[45%] truncate rounded-full bg-foreground/75 px-2 py-0.5 text-[10px] text-background">
        {afterLabel}
      </span>
    </div>
  );
}
