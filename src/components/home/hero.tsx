'use client';

import { ArrowRight, Lock, Search, Zap } from 'lucide-react';

import { Badge, Kbd } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCommandMenu } from '@/components/layout/command-menu';
import { TOTAL_TOOLS } from '@/config/tools';
import { TOOLS_SECTION_ID } from '@/lib/navigation';

const TRUST_ITEMS = [
  { icon: Lock, label: '数据不出设备', desc: '模型与文件都在本机处理' },
  { icon: Zap, label: '用真引擎干活', desc: 'WASM / WebCodecs / Web Crypto' },
  { icon: Search, label: '命令面板直达', desc: '⌘K 秒开任意工具' },
];

export function Hero() {
  const { setOpen } = useCommandMenu();

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="bg-grid absolute inset-0 opacity-45 [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent)]" />
      <div className="bg-glow absolute inset-0" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="default" size="md" className="animate-fade-in">
            <span className="size-1.5 rounded-full bg-primary" />
            {TOTAL_TOOLS} 个工具 · 全部本地运行
          </Badge>

          <h1 className="text-gradient mt-6 text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-[58px] animate-fade-up">
            浏览器里的
            <br className="hidden sm:block" />
            前端超级工具库
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-up">
            把桌面软件的能力搬进浏览器：本地跑 AI 模型、硬件转码视频、在页面里查数据库、
            解析语法树、生成设计系统。
            <span className="text-foreground"> 没有一个字节离开你的设备。</span>
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up">
            <Button variant="primary" size="lg" asChild>
              <a href={`#${TOOLS_SECTION_ID}`}>
                浏览全部工具
                <ArrowRight />
              </a>
            </Button>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="group inline-flex h-12 items-center gap-3 rounded-xl border border-border bg-surface px-5 text-sm font-medium shadow-xs transition-all duration-200 hover:border-border-strong hover:shadow-sm"
            >
              <Search className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              搜索工具
              <span className="flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/70 px-4 py-3 text-left backdrop-blur-sm"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-tight">{label}</span>
                  <span className="block text-[11px] text-muted-foreground">{desc}</span>
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
