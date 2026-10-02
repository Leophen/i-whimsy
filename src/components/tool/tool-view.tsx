'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/card';
import { InfoTip } from '@/components/ui/tooltip';
import { ToolShell } from '@/components/tool/shell';
import { getCategory, getTool, type ToolMeta } from '@/config/tools';
import { useToolStore } from '@/stores/use-tool-store';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * useTrackRecent — 进入工具页即记入「最近使用」
 * ------------------------------------------------------------------ */
export function useTrackRecent(slug: string) {
  const pushRecent = useToolStore((s) => s.pushRecent);
  const hydrated = useToolStore((s) => s.hydrated);
  React.useEffect(() => {
    if (hydrated) pushRecent(slug);
  }, [hydrated, slug, pushRecent]);
}

/* ------------------------------------------------------------------ *
 * FavoriteButton
 * ------------------------------------------------------------------ */
export function FavoriteButton({ slug, name }: { slug: string; name: string }) {
  const favorites = useToolStore((s) => s.favorites);
  const toggleFavorite = useToolStore((s) => s.toggleFavorite);
  const storeHydrated = useToolStore((s) => s.hydrated);
  const isFav = storeHydrated && favorites.includes(slug);

  return (
    <button
      type="button"
      aria-label={isFav ? `取消收藏 ${name}` : `收藏 ${name}`}
      aria-pressed={isFav}
      onClick={() => toggleFavorite(slug)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors',
        isFav
          ? 'border-danger/35 bg-danger-subtle text-danger'
          : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
      )}
    >
      <Heart className={cn('size-3.5', isFav && 'fill-current')} />
      {isFav ? '已收藏' : '收藏'}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * ToolView — 每个工具页的统一外层
 * - 自动带上标题 / 描述 / 分类徽章 / 收藏按钮
 * - children 为工具自身的交互主体
 * ------------------------------------------------------------------ */
export interface ToolViewProps {
  tool: ToolMeta;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function ToolView({ tool, actions, footer, children }: ToolViewProps) {
  const Icon = tool.icon;
  const category = getCategory(tool.category);

  return (
    <ToolShell
      icon={<Icon />}
      title={tool.name}
      description={tool.description}
      badges={
        <>
          <Link href={`/categories/${category.id}`}>
            <Badge
              variant="neutral"
              className="border-transparent transition-colors hover:bg-surface-3"
              style={{ color: category.accentVar }}
            >
              {category.name}
            </Badge>
          </Link>
          <Badge variant="outline" size="sm">
            <Sparkles className="size-3" />
            纯本地计算
          </Badge>
          {tool.keywords.slice(0, 3).map((kw) => (
            <Badge key={kw} variant="neutral" size="sm">
              {kw}
            </Badge>
          ))}
        </>
      }
      actions={
        <>
          <FavoriteButton slug={tool.slug} name={tool.name} />
          {actions}
        </>
      }
      footer={footer}
    >
      {children}
    </ToolShell>
  );
}

/* ------------------------------------------------------------------ *
 * useToolMeta — 按 slug 取元数据，取不到直接抛错（构建期暴露问题）
 * ------------------------------------------------------------------ */
export function useToolMeta(slug: string): ToolMeta {
  const tool = getTool(slug);
  if (!tool) throw new Error(`工具未注册：${slug}`);
  return tool;
}

/**
 * HintTip — 表单里解释某个参数含义的小问号。
 * 用法：<HintTip content="勾选后会排除 0/O、1/l/I 这类易混淆字符" />
 */
export function HintTip({ content }: { content: React.ReactNode }) {
  return (
    <InfoTip content={content}>
      <span
        tabIndex={0}
        role="note"
        aria-label="说明"
        className="grid size-4 cursor-help place-items-center rounded-full border border-border text-[9px] leading-none font-bold text-subtle-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        ?
      </span>
    </InfoTip>
  );
}
