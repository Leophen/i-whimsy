import Link from 'next/link';
import { Compass } from 'lucide-react';

import { CATEGORIES } from '@/config/tools';
import { homeToolsHref } from '@/lib/navigation';

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <span className="grid size-14 place-items-center rounded-2xl border border-border bg-surface text-muted-foreground">
        <Compass className="size-6" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">这个页面不存在</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        链接可能已经变了，或者这个工具还没上线。回首页看看有没有你要找的。
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {CATEGORIES.slice(0, 6).map((c) => (
          <Link
            key={c.id}
            href={homeToolsHref(c.id)}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {c.name}
          </Link>
        ))}
      </div>

      <Link
        href={homeToolsHref()}
        className="mt-8 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        浏览全部工具
      </Link>
    </div>
  );
}
