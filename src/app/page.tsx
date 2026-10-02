import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Blocks, Gauge, ShieldCheck } from 'lucide-react';

import { Hero } from '@/components/home/hero';
import { HomeToolsSection, HomeToolsSectionFallback } from '@/components/home/home-tools-section';
import { CATEGORIES } from '@/config/tools';
import { siteConfig } from '@/config/site';
import { parseCategoryParam } from '@/lib/navigation';

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: '/' },
};

const SECTION_FEATURES = [
  {
    icon: ShieldCheck,
    title: '隐私优先',
    body: '所有工具在浏览器本地计算。照片、录音、视频与模型输入永远不会经过任何服务器。',
  },
  {
    icon: Gauge,
    title: '打开即用',
    body: '没有注册流程，没有付费墙，没有「今日剩余 3 次」。首屏只加载你正在用的那个工具。',
  },
  {
    icon: Blocks,
    title: '为每个工具做了专门优化',
    body: '不是套同一个表单模板：抠图有前后对比滑块，调色实时预览，AI 推理带真实下载进度。',
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const initialCategory = parseCategoryParam(category);

  return (
    <>
      <HomeStructuredData />
      <Hero />

      <Suspense fallback={<HomeToolsSectionFallback />}>
        <HomeToolsSection initialCategory={initialCategory} />
      </Suspense>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
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
    </>
  );
}
