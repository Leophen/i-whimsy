import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ToolGrid } from '@/components/tool/tool-card';
import { CATEGORIES, CATEGORY_MAP, getCategory, toolsByCategory } from '@/config/tools';
import { siteConfig } from '@/config/site';
import type { CategoryId } from '@/config/tools';

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const category = CATEGORY_MAP[id];
  if (!category) return { title: '分类不存在' };

  const count = toolsByCategory(id as CategoryId).length;
  const title = `${category.name} · ${count} 个在线${category.name}工具`;

  return {
    title,
    description: `${category.description} 共 ${count} 个工具，全部在浏览器本地运行，无需注册。`,
    keywords: [category.name, category.enName, '在线工具', '前端工具'],
    alternates: { canonical: `/categories/${id}` },
    openGraph: {
      title,
      description: category.description,
      url: `${siteConfig.url}/categories/${id}`,
      type: 'website',
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!CATEGORY_MAP[id]) notFound();

  const category = getCategory(id as CategoryId);
  const tools = toolsByCategory(id as CategoryId);
  const Icon = category.icon;
  const others = CATEGORIES.filter((c) => c.id !== category.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs items={[{ label: '全部工具', href: '/tools' }, { label: category.name }]} />

      <header className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface shadow-xs"
            style={{ color: category.accentVar }}
          >
            <Icon className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
              {category.name}
              <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
                {category.enName}
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {category.description}
            </p>
          </div>
        </div>
        <span className="tabular rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          {tools.length} 个工具
        </span>
      </header>

      <div className="mt-8">
        <ToolGrid slugs={tools.map((t) => t.slug)} />
      </div>

      <section className="mt-12">
        <h2 className="text-[15px] font-semibold tracking-tight">看看其他分类</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {others.map((c) => {
            const OtherIcon = c.icon;
            const count = toolsByCategory(c.id).length;
            return (
              <Link
                key={c.id}
                href={`/categories/${c.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-2"
                  style={{ color: c.accentVar }}
                >
                  <OtherIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{c.name}</span>
                  <span className="tabular block text-[11px] text-muted-foreground">
                    {count} 个
                  </span>
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
