import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <>
      <nav aria-label="面包屑导航" className={cn('flex items-center gap-1.5 text-xs', className)}>
        <Link
          href="/"
          aria-label="首页"
          className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Home className="size-3.5" />
        </Link>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="size-3 shrink-0 text-subtle-foreground" aria-hidden />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
      <BreadcrumbJsonLd items={items} />
    </>
  );
}

/** 面包屑结构化数据，帮助搜索引擎理解站点层级 */
function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://i-whimsy.vercel.app';
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: base },
      ...items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: item.label,
        ...(item.href ? { item: `${base}${item.href}` } : {}),
      })),
    ],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}
