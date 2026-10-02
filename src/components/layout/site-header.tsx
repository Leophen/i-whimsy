'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';

import { GithubIcon } from '@/components/layout/brand-icons';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { CommandMenu, useCommandMenu } from '@/components/layout/command-menu';
import { Kbd } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CATEGORIES } from '@/config/tools';
import { siteConfig } from '@/config/site';

const NAV_LINKS = [
  { href: '/tools', label: '全部工具' },
  { href: '/about', label: '关于' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { setOpen } = useCommandMenu();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-200',
          scrolled
            ? 'border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60'
            : 'border-b border-transparent bg-background/40 backdrop-blur-sm',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="shrink-0 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none"
            aria-label={`${siteConfig.name} 首页`}
          >
            <Logo />
          </Link>

          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}

            <DropdownMenu.Root>
              <DropdownMenu.Trigger
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  pathname.startsWith('/categories')
                    ? 'bg-surface-2 text-foreground'
                    : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                  'focus-visible:outline-none',
                )}
              >
                分类
                <ChevronDown className="size-3.5 transition-transform duration-200 data-[state=open]:rotate-180" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 w-72 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-scale-in"
                >
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <DropdownMenu.Item key={cat.id} asChild>
                        <Link
                          href={`/categories/${cat.id}`}
                          className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-surface-2"
                        >
                          <span className="mt-0.5 shrink-0" style={{ color: cat.accentVar }}>
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium leading-tight">{cat.name}</span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                              {cat.description}
                            </span>
                          </span>
                        </Link>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                'group inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-2 pl-2.5 pr-1.5',
                'text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
                'focus-visible:outline-none',
              )}
              aria-label="搜索工具"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">搜索工具</span>
              <span className="ml-1 hidden items-center gap-0.5 sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>

            <ThemeToggle className="hidden sm:inline-flex" />

            <a
              href={siteConfig.github}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub 仓库"
              className="grid size-9 place-items-center rounded-lg border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <GithubIcon className="size-4" />
            </a>
          </div>
        </div>
      </header>
      <CommandMenu />
    </>
  );
}
