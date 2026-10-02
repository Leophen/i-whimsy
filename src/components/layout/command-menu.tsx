'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import Fuse from 'fuse.js';
import { ArrowRight, Clock3, CornerDownLeft, Heart, Search } from 'lucide-react';
import { create } from 'zustand';

import { getCategory, TOOLS, type ToolMeta } from '@/config/tools';
import { useToolStore } from '@/stores/use-tool-store';

/* ------------------------------------------------------------------ *
 * 打开状态：用轻量 store 代替 context，避免包一层 Provider
 * ------------------------------------------------------------------ */
const useMenuStore = create<{ open: boolean; setOpen: (v: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export function useCommandMenu() {
  return useMenuStore();
}

/* ------------------------------------------------------------------ *
 * 搜索索引
 * ------------------------------------------------------------------ */
const fuseIndex = new Fuse(TOOLS, {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.38,
  keys: [
    { name: 'name', weight: 4 },
    { name: 'keywords', weight: 2.2 },
    { name: 'summary', weight: 1.6 },
    { name: 'slug', weight: 1 },
    { name: 'description', weight: 0.6 },
  ],
});

function ToolItem({
  tool,
  onSelect,
  hint,
}: {
  tool: ToolMeta;
  onSelect: (slug: string) => void;
  hint?: React.ReactNode;
}) {
  const category = getCategory(tool.category);
  const Icon = tool.icon;
  return (
    <Command.Item
      value={`${tool.slug}-${tool.name}`}
      onSelect={() => onSelect(tool.slug)}
      keywords={tool.keywords}
      className="group/item flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-surface-2"
    >
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background"
        style={{ color: category.accentVar }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium leading-tight text-foreground">
          {tool.name}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {tool.summary}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
        {hint}
        <span className="opacity-0 transition-opacity group-data-[selected=true]/item:opacity-100">
          <CornerDownLeft className="size-3" />
        </span>
      </span>
    </Command.Item>
  );
}

export function CommandMenu() {
  const router = useRouter();
  const open = useMenuStore((s) => s.open);
  const setOpen = useMenuStore((s) => s.setOpen);
  const favorites = useToolStore((s) => s.favorites);
  const recent = useToolStore((s) => s.recent);
  const pushRecent = useToolStore((s) => s.pushRecent);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  const handleSelect = (slug: string) => {
    pushRecent(slug);
    setQuery('');
    setOpen(false);
    router.push(`/tools/${slug}`);
  };

  /** 关闭面板时顺手清空搜索词 —— 比 useEffect 里监听 open 再 setState 更直接 */
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    return fuseIndex.search(query.trim(), { limit: 12 }).map((r) => r.item);
  }, [query]);

  const favoriteTools = TOOLS.filter((t) => favorites.includes(t.slug));
  const recentTools = recent
    .map((slug) => TOOLS.find((t) => t.slug === slug))
    .filter((t): t is ToolMeta => Boolean(t))
    .slice(0, 5);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
      label="搜索全部工具"
      className="fixed inset-0 z-[60]"
    >
      {/* 背景遮罩 */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className="fixed inset-0 bg-background/70 backdrop-blur-sm animate-fade-in"
      />

      <div className="fixed top-[12vh] left-1/2 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2">
        <div
          className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lg animate-scale-in"
          cmdk-dialog=""
        >
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="搜索工具、功能或英文关键词…"
              className="h-13 min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-subtle-foreground/80"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              ESC
            </button>
          </div>

          <Command.List className="scrollbar-none max-h-[52vh] overflow-y-auto p-2">
            <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
              没有找到相关工具，试试「抠图」「转写」「流场」「调色」「转码」
            </Command.Empty>

            {query.trim() && results.length > 0 && (
              <CommandGroupHeading>搜索结果 · {results.length}</CommandGroupHeading>
            )}
            {results.map((tool) => (
              <ToolItem key={tool.slug} tool={tool} onSelect={handleSelect} />
            ))}

            {!query.trim() && favoriteTools.length > 0 && (
              <>
                <CommandGroupHeading>
                  <Heart className="mr-1.5 inline size-3 fill-current" />
                  我的收藏
                </CommandGroupHeading>
                {favoriteTools.map((tool) => (
                  <ToolItem key={tool.slug} tool={tool} onSelect={handleSelect} />
                ))}
              </>
            )}

            {!query.trim() && recentTools.length > 0 && (
              <>
                <CommandGroupHeading>
                  <Clock3 className="mr-1.5 inline size-3" />
                  最近使用
                </CommandGroupHeading>
                {recentTools.map((tool) => (
                  <ToolItem key={tool.slug} tool={tool} onSelect={handleSelect} />
                ))}
              </>
            )}

            {!query.trim() && (
              <>
                <CommandGroupHeading>
                  <ArrowRight className="mr-1.5 inline size-3" />
                  按分类浏览
                </CommandGroupHeading>
                {Array.from(new Set(TOOLS.map((t) => t.category))).map((cat) => {
                  const meta = getCategory(cat);
                  const Icon = meta.icon;
                  return (
                    <Command.Item
                      key={cat}
                      value={`category-${cat}`}
                      onSelect={() => {
                        setOpen(false);
                        router.push(`/categories/${cat}`);
                      }}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-surface-2"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background"
                        style={{ color: meta.accentVar }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{meta.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {TOOLS.filter((t) => t.category === cat).length} 个工具
                      </span>
                    </Command.Item>
                  );
                })}
              </>
            )}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>共 {TOOLS.length} 个工具 · 全部本地运行</span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-border px-1">↑</kbd>
              <kbd className="rounded border border-border px-1">↓</kbd>
              选择
              <kbd className="ml-2 rounded border border-border px-1">↵</kbd>
              打开
            </span>
          </div>
        </div>
      </div>
    </Command.Dialog>
  );
}

function CommandGroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </div>
  );
}
