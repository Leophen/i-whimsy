import type { Metadata } from 'next';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ToolExplorer } from '@/components/tool/tool-explorer';
import { TOTAL_TOOLS } from '@/config/tools';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `全部工具 · ${TOTAL_TOOLS} 个在线前端工具`,
  description: `iWhimsy 全部 ${TOTAL_TOOLS} 个在线工具：文本处理、编码加密、图片处理、颜色设计、数据格式、日期时间、单位换算与生成器。全部在浏览器本地运行，无需注册，数据不出本机。`,
  keywords: ['在线工具', '前端工具', '开发者工具', '工具集合', 'online tools', 'developer tools'],
  alternates: { canonical: '/tools' },
  openGraph: {
    title: `全部工具 · ${TOTAL_TOOLS} 个在线前端工具`,
    description: `按分类浏览 iWhimsy 的 ${TOTAL_TOOLS} 个纯前端在线工具，支持搜索、收藏与最近使用。`,
    url: `${siteConfig.url}/tools`,
    type: 'website',
  },
};

export default function ToolsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs items={[{ label: '全部工具' }]} />

      <header className="mt-5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          全部 {TOTAL_TOOLS} 个工具
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          按分类筛选，或直接搜索。收藏和最近使用会存在你自己的浏览器里，不会同步到任何地方。
        </p>
      </header>

      <div className="mt-8">
        <ToolExplorer />
      </div>
    </div>
  );
}
