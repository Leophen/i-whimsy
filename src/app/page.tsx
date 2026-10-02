import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Blocks, Gauge, ShieldCheck } from 'lucide-react';

import { Hero } from '@/components/home/hero';
import { ToolGrid } from '@/components/tool/tool-card';
import { CATEGORIES, FEATURED_TOOLS, TOTAL_TOOLS, toolsByCategory } from '@/config/tools';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

const SECTION_FEATURES = [
  {
    icon: ShieldCheck,
    title: '隐私优先',
    body: '所有工具在浏览器本地计算。图片、密码、JWT、API Key 这类敏感内容，永远不会经过任何服务器。',
  },
  {
    icon: Gauge,
    title: '打开即用',
    body: '没有注册流程，没有付费墙，没有「今日剩余 3 次」。首屏只加载你正在用的那个工具。',
  },
  {
    icon: Blocks,
    title: '为每个工具做了专门优化',
    body: '不是套同一个表单模板：压缩有实时对比，Diff 有行/字符两档粒度，对比度按 WCAG 2.1 判定等级。',
  },
];

/** 首页 JSON-LD：帮助搜索引擎理解站点结构与工具清单 */
function HomeStructuredData() {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: siteConfig.name,
    url: siteConfig.url,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    description: siteConfig.description,
    featureList: CATEGORIES.map((c) => c.name),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  );
}

export default function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <Hero />

      {/* 分类浏览 */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">按分类浏览</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {CATEGORIES.length} 大类工具，从写文案到调 SQL，覆盖前端日常的高频场景。
            </p>
          </div>
          <Link
            href="/tools"
            className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-primary transition-colors hover:gap-2.5"
          >
            查看全部 {TOTAL_TOOLS} 个工具
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = toolsByCategory(cat.id).length;
            return (
              <Link
                key={cat.id}
                href={`/categories/${cat.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-14 -right-10 size-32 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `oklch(from ${cat.accentVar} l c h / 0.2)` }}
                />
                <span
                  className="grid size-11 place-items-center rounded-xl border border-border bg-surface-2 transition-transform duration-200 group-hover:scale-105"
                  style={{ color: cat.accentVar }}
                >
                  <Icon className="size-5" />
                </span>
                <div className="relative mt-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[15px] font-semibold tracking-tight">{cat.name}</h3>
                    <span className="tabular text-xs text-muted-foreground">{count}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 精选工具 */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">高频精选</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              按日常使用率挑出来的 {FEATURED_TOOLS.length} 个，先试试这些。
            </p>
          </div>
        </header>
        <ToolGrid slugs={FEATURED_TOOLS.map((t) => t.slug)} className="mt-6" />
      </section>

      {/* 为什么 */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {SECTION_FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-primary-subtle text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-14 text-center sm:px-12">
          <div className="bg-glow absolute inset-0 opacity-80" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[30px]">
              把常用工具放进收藏，下次 ⌘K 直达
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              收藏和最近使用会存在你自己的浏览器里，不会同步到任何地方。
            </p>
            <Link
              href="/tools"
              className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
            >
              开始使用
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
