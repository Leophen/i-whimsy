import Link from 'next/link';

import { Logo } from '@/components/layout/logo';
import { CATEGORIES, TOTAL_TOOLS } from '@/config/tools';
import { siteConfig } from '@/config/site';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface-2/40">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {TOTAL_TOOLS} 个工具，全部运行在你的浏览器里。
              <br />
              没有上传、没有登录、没有数据收集 —— 关掉页面数据就消失。
            </p>
          </div>

          <nav aria-label="工具分类">
            <h3 className="text-xs font-semibold tracking-[0.08em] text-foreground uppercase">
              工具分类
            </h3>
            <ul className="mt-4 space-y-2">
              {CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.id}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="更多分类">
            <h3 className="text-xs font-semibold tracking-[0.08em] text-foreground uppercase">
              &nbsp;
            </h3>
            <ul className="mt-4 space-y-2">
              {CATEGORIES.slice(4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/categories/${cat.id}`}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="站点">
            <h3 className="text-xs font-semibold tracking-[0.08em] text-foreground uppercase">
              站点
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/tools"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
                >
                  全部工具
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
                >
                  关于本站
                </Link>
              </li>
              <li>
                <a
                  href={siteConfig.github}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[13px] text-muted-foreground transition-colors hover:text-primary"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {siteConfig.name} · Built by {siteConfig.author}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Next.js 16</span>
            <span aria-hidden>·</span>
            <span>React 19</span>
            <span aria-hidden>·</span>
            <span>Tailwind CSS 4</span>
            <span aria-hidden>·</span>
            <span>Radix UI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
