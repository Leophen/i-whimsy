'use client';

import { ToolExplorer } from '@/components/tool/tool-explorer';
import type { CategoryId } from '@/config/tools';
import { TOTAL_TOOLS } from '@/config/tools';
import { TOOLS_SECTION_ID } from '@/lib/navigation';

export function HomeToolsSection({ initialCategory }: { initialCategory: CategoryId | 'all' }) {
  return (
    <section
      id={TOOLS_SECTION_ID}
      className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <header className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">全部工具</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {TOTAL_TOOLS} 个工具，支持搜索与分类筛选。收藏和最近使用保存在你的浏览器里。
        </p>
      </header>

      <div className="mt-8">
        <ToolExplorer initialCategory={initialCategory} syncUrl />
      </div>
    </section>
  );
}

export function HomeToolsSectionFallback() {
  return (
    <section
      id={TOOLS_SECTION_ID}
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-2 h-4 w-72 animate-pulse rounded bg-surface-2" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    </section>
  );
}
