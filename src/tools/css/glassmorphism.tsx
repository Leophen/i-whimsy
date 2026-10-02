'use client';

import * as React from 'react';

import { CopyButton, ResetButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { DEFAULT_GLASS, buildGlassCss, type GlassParams } from '@/lib/core/css';

const PRESETS: { name: string; params: GlassParams }[] = [
  { name: '经典毛玻璃', params: { ...DEFAULT_GLASS } },
  {
    name: '极薄雾面',
    params: {
      blur: 6,
      alpha: 8,
      saturate: 120,
      radius: 12,
      borderAlpha: 16,
      borderWidth: 1,
      tint: '#ffffff',
      shadow: 12,
    },
  },
  {
    name: '厚重磨砂',
    params: {
      blur: 28,
      alpha: 30,
      saturate: 180,
      radius: 24,
      borderAlpha: 40,
      borderWidth: 1,
      tint: '#ffffff',
      shadow: 30,
    },
  },
  {
    name: '暗色玻璃',
    params: {
      blur: 16,
      alpha: 22,
      saturate: 140,
      radius: 18,
      borderAlpha: 28,
      borderWidth: 1,
      tint: '#0b1020',
      shadow: 28,
    },
  },
  {
    name: '彩色渐变玻璃',
    params: {
      blur: 18,
      alpha: 26,
      saturate: 200,
      radius: 20,
      borderAlpha: 45,
      borderWidth: 1,
      tint: '#7c5cff',
      shadow: 24,
    },
  },
];

/** 预览底图：彩色渐变块，用来体现 backdrop-filter 的透射效果 */
function Backdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#ff8a5c_0%,#ff5c8a_28%,#7c5cff_58%,#22d3ee_100%)]" />
      <div className="absolute -top-16 -left-10 size-56 rounded-full bg-[#ffe27a]/80 blur-2xl" />
      <div className="absolute right-0 -bottom-20 size-64 rounded-full bg-[#00d3a7]/70 blur-2xl" />
      <div className="absolute inset-0 opacity-70 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.16)_0_2px,transparent_2px_14px)]" />
    </div>
  );
}

export default function Glassmorphism() {
  const tool = useToolMeta('glassmorphism');
  useTrackRecent(tool.slug);

  const [p, setP] = React.useState<GlassParams>(DEFAULT_GLASS);
  const patch = (next: Partial<GlassParams>) => setP((prev) => ({ ...prev, ...next }));

  const css = buildGlassCss(p);
  const fullCss = `.glass {\n${css
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')}\n}`;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ResetButton onReset={() => setP(DEFAULT_GLASS)} />
          <CopyButton value={fullCss} sourceLabel="CSS 代码" variant="secondary">
            复制 CSS
          </CopyButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <Panel title="参数" description="模糊与透明度是毛玻璃观感的两个关键">
          <div className="space-y-3.5">
            <SliderRow
              label="模糊 Blur"
              value={p.blur}
              onChange={(v) => patch({ blur: v })}
              min={0}
              max={40}
              suffix=" px"
            />
            <SliderRow
              label="背景不透明度"
              value={p.alpha}
              onChange={(v) => patch({ alpha: v })}
              min={0}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="饱和度 Saturate"
              value={p.saturate}
              onChange={(v) => patch({ saturate: v })}
              min={100}
              max={250}
              suffix=" %"
            />
            <SliderRow
              label="圆角 Radius"
              value={p.radius}
              onChange={(v) => patch({ radius: v })}
              min={0}
              max={48}
              suffix=" px"
            />
            <SliderRow
              label="边框宽度"
              value={p.borderWidth}
              onChange={(v) => patch({ borderWidth: v })}
              min={0}
              max={4}
              suffix=" px"
            />
            <SliderRow
              label="边框不透明度"
              value={p.borderAlpha}
              onChange={(v) => patch({ borderAlpha: v })}
              min={0}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="阴影强度"
              value={p.shadow}
              onChange={(v) => patch({ shadow: v })}
              min={0}
              max={60}
              suffix=" %"
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">色调</span>
              <input
                type="color"
                value={p.tint}
                onChange={(e) => patch({ tint: e.target.value })}
                aria-label="玻璃色调"
                className="h-8 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <code className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                {p.tint}
              </code>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-3.5">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              预设
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setP(item.params)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="实时预览" description="底图是彩色渐变，能直观看出透射与模糊">
            <div className="relative h-72 overflow-hidden rounded-xl border border-border">
              <Backdrop />
              <div className="absolute inset-0 grid place-items-center p-8">
                <div
                  className="w-full max-w-sm p-6 text-center"
                  style={{
                    background: `color-mix(in srgb, ${p.tint} ${p.alpha}%, transparent)`,
                    backdropFilter: `blur(${p.blur}px) saturate(${p.saturate}%)`,
                    WebkitBackdropFilter: `blur(${p.blur}px) saturate(${p.saturate}%)`,
                    borderRadius: `${p.radius}px`,
                    border: `${p.borderWidth}px solid color-mix(in srgb, ${p.tint} ${p.borderAlpha}%, transparent)`,
                    boxShadow: `0 8px 32px rgba(0, 0, 0, ${(p.shadow / 100).toFixed(2)})`,
                  }}
                >
                  <p className="text-lg font-semibold text-white drop-shadow">Glassmorphism</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/85">
                    毛玻璃依赖 backdrop-filter，父级不能有 overflow: hidden 造成的层叠上下文问题。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <StatGrid
                columns={4}
                items={[
                  { label: '模糊', value: `${p.blur}px`, tone: 'primary' },
                  { label: '不透明度', value: `${p.alpha}%` },
                  { label: '饱和度', value: `${p.saturate}%` },
                  { label: '圆角', value: `${p.radius}px` },
                ]}
              />
            </div>
          </Panel>

          <Panel
            title="CSS 代码"
            actions={
              <CopyButton value={fullCss} sourceLabel="CSS" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">
              {fullCss}
            </pre>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Safari 至今仍需 <code className="font-mono">-webkit-backdrop-filter</code>；
              元素自身背景必须半透明，否则 backdrop-filter 看不出效果。
            </p>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
