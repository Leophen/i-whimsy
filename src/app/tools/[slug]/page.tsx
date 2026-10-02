import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ToolNeighbours, ToolRuntime } from '@/components/tool/tool-runtime';
import { ToolGrid } from '@/components/tool/tool-card';
import { Badge } from '@/components/ui/card';
import { CATEGORY_MAP, TOOLS, getCategory, getTool, toolsByCategory } from '@/config/tools';
import { siteConfig } from '@/config/site';

export const dynamicParams = false;

/** 构建期把所有工具页全部静态生成 */
export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return { title: '工具不存在' };

  const category = getCategory(tool.category);
  const title = `${tool.name} · 在线${category.name}工具`;
  const url = `${siteConfig.url}/tools/${tool.slug}`;

  return {
    title,
    description: tool.description,
    keywords: [...tool.keywords, tool.name, category.name, '在线工具'],
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: {
      type: 'website',
      url,
      title,
      description: tool.description,
      siteName: siteConfig.name,
      locale: 'zh_CN',
    },
    twitter: { card: 'summary_large_image', title, description: tool.description },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const category = getCategory(tool.category);
  const related = toolsByCategory(tool.category)
    .filter((t) => t.slug !== tool.slug)
    .slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${tool.name} - ${siteConfig.name}`,
    url: `${siteConfig.url}/tools/${tool.slug}`,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Runs entirely in the browser.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    description: tool.description,
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: '全部工具', href: '/tools' },
          { label: category.name, href: `/categories/${category.id}` },
          { label: tool.name },
        ]}
      />

      <div className="mt-5">
        <ToolRuntime slug={tool.slug} />
      </div>

      {/* 服务端渲染的静态说明，保证页面有可被索引的正文 */}
      <section className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold tracking-tight">关于{tool.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="neutral" size="sm">
            分类：{category.name}
          </Badge>
          {tool.keywords.map((kw) => (
            <Badge key={kw} variant="outline" size="sm">
              {kw}
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
          这个工具和你用过的所有 iWhimsy 工具一样：输入什么、算出什么，全部发生在你自己的浏览器里，
          没有一个字节被发送到服务器，也不需要登录或联网。
        </p>
      </section>

      {related.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">同类工具 · {category.name}</h2>
            <Link
              href={`/categories/${category.id}`}
              className="text-[13px] font-medium text-primary transition-colors hover:underline"
            >
              查看该分类全部 →
            </Link>
          </div>
          <ToolGrid slugs={related.map((t) => t.slug)} className="mt-4" compact />
        </section>
      )}

      <div className="mt-8">
        <ToolNeighbours slug={tool.slug} />
      </div>
    </div>
  );
}

/** 供 sitemap 复用：所有已注册工具的 slug */
export const ALL_SLUGS = TOOLS.map((t) => t.slug);
export const CATEGORY_IDS = Object.keys(CATEGORY_MAP);
