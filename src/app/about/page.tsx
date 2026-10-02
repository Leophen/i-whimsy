import type { Metadata } from 'next';
import Link from 'next/link';
import { GithubIcon } from '@/components/layout/brand-icons';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { CATEGORIES, TOTAL_TOOLS } from '@/config/tools';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: '关于 iWhimsy',
  description: `iWhimsy 是一个跑在浏览器里的前端超级工具库：文本、编码加密、图片、颜色、数据、日期、换算、CSS 与前端、开发速查、视觉创意与生成器，共 ${TOTAL_TOOLS} 个工具，全部本地计算，数据不出浏览器。`,
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  {
    title: '数据不出浏览器',
    body: '所有计算都在本地完成。图片、口令、JWT、API Key 这类敏感内容从来不会被发送到任何服务器 —— 这个站没有后端接口来处理它们。',
  },
  {
    title: '打开即用，没有门槛',
    body: '不注册、不登录、不限次数、不弹广告。要用哪个工具，打开就用完走。',
  },
  {
    title: '为每个工具单独设计',
    body: '不是套同一个表单模板：压缩有实时前后对比，Diff 有行/字符两档粒度，对比度按 WCAG 2.1 判定等级。每个工具都按它自己的场景做交互。',
  },
  {
    title: '技术栈保持现代',
    body: 'Next.js App Router + React 19 + Tailwind CSS 4 + Radix UI，全站静态生成，按需加载 —— 首屏只下载你正在用的那个工具的代码。',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Breadcrumbs items={[{ label: '关于' }]} />

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">关于 iWhimsy</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          iWhimsy 是一个跑在浏览器里的前端超级工具库。目前有 {TOTAL_TOOLS} 个工具，
          覆盖写文案、调接口、处理图片、校验颜色、换算单位这些日常高频场景 ——
          它们的共同点是：全都只需要浏览器就能算完。
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">四条原则</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border bg-surface p-5">
              <h3 className="text-[15px] font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">工具分类</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                href={`/categories/${c.id}`}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2"
                  style={{ color: c.accentVar }}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{c.name}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {c.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold tracking-tight">快捷键</h2>
        <ul className="mt-4 space-y-2.5 text-sm">
          <li className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">打开命令面板，搜索任意工具</span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                ⌘
              </kbd>
              <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                K
              </kbd>
              <span className="text-xs text-subtle-foreground">/ Ctrl K</span>
            </span>
          </li>
          <li className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">收藏当前工具</span>
            <span className="text-xs text-muted-foreground">工具页右上角「收藏」</span>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-subtle-foreground">
          收藏与最近使用保存在浏览器 localStorage 里，换设备或清理缓存会丢失。
        </p>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/tools"
          className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          浏览全部 {TOTAL_TOOLS} 个工具
        </Link>
        <a
          href={siteConfig.github}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-medium transition-colors hover:border-border-strong"
        >
          <GithubIcon className="size-4" />在 GitHub 上查看
        </a>
      </section>
    </div>
  );
}
