'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { TOOL_COMPONENTS } from '@/tools/registry';
import { TOOLS, getTool, type ToolMeta } from '@/config/tools';

/** 同一分类内的上一个 / 下一个工具，用于页脚导航 */
export function getNeighbours(slug: string): { prev: ToolMeta | null; next: ToolMeta | null } {
  const tool = getTool(slug);
  if (!tool) return { prev: null, next: null };
  const siblings = TOOLS.filter((t) => t.category === tool.category);
  const index = siblings.findIndex((t) => t.slug === slug);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: siblings[(index - 1 + siblings.length) % siblings.length] ?? null,
    next: siblings[(index + 1) % siblings.length] ?? null,
  };
}

/**
 * ToolRuntime —— 按 slug 渲染对应工具组件。
 * 放在客户端，配合注册表里的 dynamic import 做代码分割。
 */
export function ToolRuntime({ slug }: { slug: string }) {
  const Component = TOOL_COMPONENTS[slug];

  if (!Component) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-sm font-medium text-foreground">这个工具还没上线</p>
        <p className="mt-1 text-xs text-muted-foreground">slug：{slug}</p>
        <Link
          href="/tools"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          查看全部工具
        </Link>
      </div>
    );
  }

  return <Component />;
}

/** 工具页底部的上一个 / 下一个导航 */
export function ToolNeighbours({ slug }: { slug: string }) {
  const { prev, next } = React.useMemo(() => getNeighbours(slug), [slug]);
  if (!prev && !next) return null;

  return (
    <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="同分类的其他工具">
      {prev && (
        <Link
          href={`/tools/${prev.slug}`}
          className="group flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40"
        >
          <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">上一个</span>
            <span className="block truncate text-[13px] font-medium">{prev.name}</span>
          </span>
        </Link>
      )}
      {next && (
        <Link
          href={`/tools/${next.slug}`}
          className="group flex items-center justify-end gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-right transition-colors hover:border-primary/40 sm:col-start-2"
        >
          <span className="min-w-0">
            <span className="block text-[11px] text-muted-foreground">下一个</span>
            <span className="block truncate text-[13px] font-medium">{next.name}</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </nav>
  );
}
