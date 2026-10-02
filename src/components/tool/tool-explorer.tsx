'use client';

import * as React from 'react';
import Fuse from 'fuse.js';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Heart, History, LayoutGrid, Search, X } from 'lucide-react';

import { ToolGrid } from '@/components/tool/tool-card';
import { SegmentedControl } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/card';
import { CATEGORIES, TOOLS, type CategoryId, type ToolMeta } from '@/config/tools';
import { homeToolsHref, parseCategoryParam, TOOLS_SECTION_ID } from '@/lib/navigation';
import { useToolStore } from '@/stores/use-tool-store';
import { cn } from '@/lib/utils';

type Scope = 'all' | 'ready' | 'favorites' | 'recent';

const SCOPES: { value: Scope; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: '全部', icon: <LayoutGrid className="size-3.5" /> },
  { value: 'ready', label: '已上线', icon: <CheckCircle2 className="size-3.5" /> },
  { value: 'favorites', label: '收藏', icon: <Heart className="size-3.5" /> },
  { value: 'recent', label: '最近', icon: <History className="size-3.5" /> },
];

/** 已实现的工具排在前面，避免开发中工具把可用项埋掉 */
const READY_FIRST = (a: ToolMeta, b: ToolMeta) =>
  a.status === b.status ? 0 : a.status === 'ready' ? -1 : 1;

type ToolExplorerProps = {
  initialCategory?: CategoryId | 'all';
  /** 在首页使用时同步 ?category= 到地址栏，便于分享筛选结果 */
  syncUrl?: boolean;
};

export function ToolExplorer({ initialCategory = 'all', syncUrl = false }: ToolExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState('');
  const [localCategory, setLocalCategory] = React.useState<CategoryId | 'all'>(initialCategory);
  const [scope, setScope] = React.useState<Scope>('all');

  const favorites = useToolStore((s) => s.favorites);
  const recent = useToolStore((s) => s.recent);
  const hydrated = useToolStore((s) => s.hydrated);

  const categoryFromUrl = parseCategoryParam(searchParams.get('category'));
  const category = syncUrl && pathname === '/' ? categoryFromUrl : localCategory;

  const didInitialScroll = React.useRef(false);
  React.useEffect(() => {
    if (
      !syncUrl ||
      pathname !== '/' ||
      categoryFromUrl === 'all' ||
      didInitialScroll.current
    ) {
      return;
    }
    didInitialScroll.current = true;
    requestAnimationFrame(() => {
      document.getElementById(TOOLS_SECTION_ID)?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [categoryFromUrl, pathname, syncUrl]);

  const updateCategory = React.useCallback(
    (next: CategoryId | 'all') => {
      if (syncUrl && pathname === '/') {
        router.replace(homeToolsHref(next), { scroll: false });
        return;
      }
      setLocalCategory(next);
    },
    [pathname, router, syncUrl],
  );

  const fuse = React.useMemo(
    () =>
      new Fuse(TOOLS, {
        keys: [
          { name: 'name', weight: 3 },
          { name: 'summary', weight: 2 },
          { name: 'keywords', weight: 2 },
          { name: 'slug', weight: 1 },
          { name: 'description', weight: 1 },
        ],
        threshold: 0.38,
        ignoreLocation: true,
        includeScore: false,
      }),
    [],
  );

  const countsByCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of TOOLS) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return map;
  }, []);

  const tools = React.useMemo(() => {
    let list: ToolMeta[] = TOOLS;

    if (scope === 'ready') {
      list = list.filter((t) => t.status === 'ready');
    } else if (scope === 'favorites') {
      list = hydrated ? list.filter((t) => favorites.includes(t.slug)) : [];
    } else if (scope === 'recent') {
      list = hydrated
        ? recent
            .map((slug) => TOOLS.find((t) => t.slug === slug))
            .filter((t): t is ToolMeta => Boolean(t))
        : [];
    }

    if (category !== 'all') list = list.filter((t) => t.category === category);

    const q = query.trim();
    if (!q) return [...list].sort(READY_FIRST);

    if (scope === 'recent') {
      // 最近/收藏是固定顺序，不再模糊排序
      const lower = q.toLowerCase();
      return list.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.summary.toLowerCase().includes(lower) ||
          t.keywords.some((k) => k.toLowerCase().includes(lower)),
      );
    }

    return fuse
      .search(q)
      .map((r) => r.item)
      .filter((t) => (category === 'all' ? true : t.category === category))
      .sort(READY_FIRST);
  }, [query, category, scope, favorites, recent, hydrated, fuse]);

  const total = TOOLS.length;
  const readyCount = TOOLS.filter((t) => t.status === 'ready').length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
      {/* 侧边栏：桌面端常驻 */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto">
        <div className="hidden lg:block">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            分类
          </span>
          <nav className="mt-3 space-y-1">
            <SidebarItem
              label="全部工具"
              count={total}
              active={category === 'all'}
              onClick={() => updateCategory('all')}
            />
            <SidebarItem
              label="已上线"
              count={readyCount}
              active={false}
              onClick={() => {
                updateCategory('all');
                setScope('ready');
              }}
            />
            {CATEGORIES.map((c) => (
              <SidebarItem
                key={c.id}
                label={c.name}
                count={countsByCategory.get(c.id) ?? 0}
                active={category === c.id}
                onClick={() => updateCategory(c.id)}
                accent={c.accentVar}
              />
            ))}
          </nav>
        </div>

        {/* 移动端：横向滚动的 chip */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
          <div className="flex gap-1.5">
            <ChipButton
              label="全部"
              count={total}
              active={category === 'all'}
              onClick={() => updateCategory('all')}
            />
            {CATEGORIES.map((c) => (
              <ChipButton
                key={c.id}
                label={c.name}
                count={countsByCategory.get(c.id) ?? 0}
                active={category === c.id}
                onClick={() => updateCategory(c.id)}
              />
            ))}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`搜索 ${total} 个工具…`}
              className="pl-9 pr-9"
              aria-label="搜索工具"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="清空搜索"
                className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <SegmentedControl
            size="sm"
            value={scope}
            onValueChange={setScope}
            options={SCOPES.map((s) => ({ value: s.value, label: s.label, icon: s.icon }))}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {scope === 'all'
              ? `共 ${total} 个工具`
              : scope === 'ready'
                ? readyCount === total
                  ? `全部 ${total} 个工具已上线`
                  : `已上线 ${readyCount} 个（其余 ${total - readyCount} 个开发中）`
                : scope === 'favorites'
                  ? `收藏了 ${favorites.length} 个`
                  : `最近使用 ${recent.length} 个`}
            {category !== 'all' && <> · {CATEGORIES.find((c) => c.id === category)?.name}</>}
            {query.trim() && <> · 匹配 {tools.length} 个</>}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            也能直达
          </span>
        </div>

        <div className="mt-5">
          {scope !== 'all' && !hydrated ? (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              正在读取本地记录…
            </p>
          ) : scope !== 'all' && tools.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              {scope === 'ready'
                ? '没有匹配的已上线工具'
                : scope === 'favorites'
                  ? '还没有收藏任何工具，点卡片右上角的心形即可收藏'
                  : '还没有使用记录'}
            </p>
          ) : (
            <ToolGrid slugs={tools.map((t) => t.slug)} />
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
  accent,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors',
        active
          ? 'bg-primary-subtle font-medium text-primary'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {accent && (
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: accent }}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular shrink-0 text-[11px] text-subtle-foreground">{count}</span>
    </button>
  );
}

function ChipButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary-subtle text-primary'
          : 'border-border bg-surface text-muted-foreground hover:border-border-strong',
      )}
    >
      {label}
      <span className="tabular ml-1.5 text-subtle-foreground">{count}</span>
    </button>
  );
}
