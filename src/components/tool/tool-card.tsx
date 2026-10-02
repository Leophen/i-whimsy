'use client';

import Link from 'next/link';
import { Clock, Heart } from 'lucide-react';

import { Badge } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getCategory, getTool } from '@/config/tools';
import { useToolStore } from '@/stores/use-tool-store';
import { useHydrated } from '@/lib/hooks';

/**
 * 注意：卡片只接收 slug，不接收完整的 ToolMeta。
 * ToolMeta 里的 icon 是 React 组件（函数），服务端组件无法把它序列化后
 * 传给客户端组件 —— 元数据统一在客户端内部按 slug 查表。
 */
export interface ToolCardProps {
  slug: string;
  /** 是否显示收藏按钮 */
  favorite?: boolean;
  /** 紧凑模式：隐藏分类徽章，缩小内边距 */
  compact?: boolean;
  className?: string;
}

export function ToolCard({ slug, favorite = true, compact, className }: ToolCardProps) {
  // hooks 必须在任何提前 return 之前调用，否则违反 rules-of-hooks
  const favorites = useToolStore((s) => s.favorites);
  const toggleFavorite = useToolStore((s) => s.toggleFavorite);
  const hydrated = useHydrated();

  const tool = getTool(slug);
  if (!tool) return null;

  const CategoryIcon = tool.icon;
  const category = getCategory(tool.category);
  const isFav = hydrated && favorites.includes(tool.slug);

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface',
        'p-4 transition-[transform,border-color,box-shadow] duration-200 ease-out-expo',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        tool.status === 'planned' && 'border-dashed',
        'focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
        compact ? 'gap-2.5' : 'gap-3 p-5',
        className,
      )}
    >
      {/* 悬停时的径向高光 */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `oklch(from ${category.accentVar} l c h / 0.16)` }}
      />

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-xl border border-border bg-surface-2 transition-transform duration-200 group-hover:scale-105',
            compact ? 'size-9 [&_svg]:size-4' : 'size-10 [&_svg]:size-[18px]',
          )}
          style={{ color: category.accentVar }}
        >
          <CategoryIcon />
        </span>

        {favorite && (
          <button
            type="button"
            aria-label={isFav ? `取消收藏 ${tool.name}` : `收藏 ${tool.name}`}
            aria-pressed={isFav}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(tool.slug);
            }}
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-md transition-all duration-150',
              isFav
                ? 'text-danger opacity-100'
                : 'text-muted-foreground/50 opacity-0 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100',
            )}
          >
            <Heart className={cn('size-3.5', isFav && 'fill-current')} />
          </button>
        )}
      </div>

      <div className="relative min-w-0">
        <h3
          className={cn(
            'font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary',
            compact ? 'text-[13px]' : 'text-[15px]',
          )}
        >
          {tool.name}
        </h3>
        <p
          className={cn(
            'mt-1.5 text-xs leading-relaxed text-muted-foreground',
            compact ? 'line-clamp-2' : 'line-clamp-2',
          )}
        >
          {tool.summary}
        </p>
      </div>

      <div
        className={cn('mt-auto flex flex-wrap items-center gap-1.5', compact ? 'pt-0.5' : 'pt-1')}
      >
        {!compact && (
          <Badge
            variant="neutral"
            className="border-transparent"
            style={{ color: category.accentVar }}
          >
            {category.name}
          </Badge>
        )}
        {tool.status === 'planned' && (
          <Badge variant="warning" size="sm">
            <Clock className="size-3" />
            开发中
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function ToolGrid({
  slugs,
  favorite = true,
  compact,
  className,
}: {
  /** 工具 slug 列表 */
  slugs: string[];
  favorite?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const list = slugs;

  if (list.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        没有匹配的工具，换个关键词试试
      </p>
    );
  }
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {list.map((slug) => (
        <ToolCard key={slug} slug={slug} favorite={favorite} compact={compact} />
      ))}
    </div>
  );
}
