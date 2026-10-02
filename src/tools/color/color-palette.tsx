'use client';

import * as React from 'react';
import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import {
  generateHarmony,
  generateShades,
  isValidColor,
  toColorSet,
  type HarmonyMode,
} from '@/lib/core/color';
import { cn } from '@/lib/utils';

const HARMONIES: { value: HarmonyMode; label: string; note: string }[] = [
  { value: 'complementary', label: '互补色', note: '色轮上相隔 180°，对比最强' },
  { value: 'analogous', label: '类似色', note: '相邻 30°，柔和统一' },
  { value: 'triadic', label: '三角配色', note: '相隔 120°，均衡且有张力' },
  { value: 'tetradic', label: '四方配色', note: '两组互补，色彩丰富' },
  { value: 'split', label: '分裂互补', note: '互补色的两侧，冲突更弱' },
];

export default function ColorPalette() {
  const tool = useToolMeta('color-palette');
  useTrackRecent(tool.slug);

  const [base, setBase] = React.useState('#7c5cff');
  const [steps, setSteps] = React.useState(10);
  const [active, setActive] = React.useState<HarmonyMode>('complementary');

  const valid = isValidColor(base);
  const set = React.useMemo(() => toColorSet(base), [base]);
  const shades = React.useMemo(
    () => (valid ? generateShades(base, steps) : []),
    [base, steps, valid],
  );
  const harmony = React.useMemo(
    () => (valid ? generateHarmony(base, active) : []),
    [base, active, valid],
  );

  const cssVars = React.useMemo(
    () => shades.map((c, i) => `  --color-${(i + 1) * 100}: ${c};`).join('\n'),
    [shades],
  );

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={cssVars} sourceLabel="CSS 变量" variant="secondary">
          复制色阶变量
        </CopyButton>
      }
    >
      <Panel title="基础色" description="输入一个色值，自动生成色阶与和谐配色">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            value={set?.hex.slice(0, 7) ?? '#000000'}
            onChange={(e) => setBase(e.target.value)}
            aria-label="基础色"
            className="h-14 w-20 cursor-pointer rounded-xl border border-border bg-background p-1.5"
          />
          <input
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="#7c5cff 或 rgb(124,92,255)"
            className={cn(
              'h-10 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-[13px]',
              'focus:border-primary focus:outline-none',
              !valid && 'border-danger',
            )}
            spellCheck={false}
          />
          <div className="flex gap-1.5">
            {['#7c5cff', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`使用 ${c}`}
                onClick={() => setBase(c)}
                className="size-8 rounded-lg border border-border transition-transform hover:scale-110"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <SliderRow
            label="色阶数量"
            value={steps}
            onChange={setSteps}
            min={5}
            max={16}
            suffix=" 级"
          />
        </div>
      </Panel>

      {!valid ? (
        <Notice tone="danger">无法识别「{base}」，请输入 HEX、rgb() 或色名</Notice>
      ) : (
        <>
          <Panel title="色阶" description={`由 ${base} 展开的 ${shades.length} 级明度轴`}>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex">
                {shades.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(c)}
                    title={`复制 ${c}`}
                    className="group h-24 flex-1 transition-transform duration-150 hover:scale-y-105"
                    style={{ background: c }}
                  >
                    <span className="sr-only">{c}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {shades.map((c, i) => (
                <div
                  key={`row-${c}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1.5"
                >
                  <span
                    className="size-4 shrink-0 rounded border border-border"
                    style={{ background: c }}
                  />
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{c}</code>
                  <CopyIconButton value={c} sourceLabel={c} className="size-6" />
                </div>
              ))}
            </div>

            <pre className="mt-3 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed">
              {`:root {\n${cssVars}\n}`}
            </pre>
          </Panel>

          <Panel title="和谐配色" description={HARMONIES.find((h) => h.value === active)?.note}>
            <div className="flex flex-wrap gap-1.5">
              {HARMONIES.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setActive(h.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    active === h.value
                      ? 'border-primary bg-primary-subtle text-primary'
                      : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {harmony.map((c, i) => (
                <div
                  key={`h-${c}-${i}`}
                  className="overflow-hidden rounded-xl border border-border"
                >
                  <div className="h-20 w-full" style={{ background: c }} />
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {i === 0 ? '基础' : `#${i + 1}`}
                    </span>
                    <code className="font-mono text-[11px]">{c}</code>
                    <CopyIconButton value={c} sourceLabel={c} className="size-6" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="搭配示例" description="用当前配色渲染一段真实界面">
            <div className="rounded-xl border border-border p-5" style={{ background: shades[0] }}>
              <div className="rounded-lg p-5" style={{ background: shades[shades.length - 1] }}>
                <h3 className="text-lg font-semibold" style={{ color: shades[8] ?? base }}>
                  设计系统配色
                </h3>
                <p className="mt-1.5 text-sm" style={{ color: shades[6] ?? base }}>
                  由基础色自动派生出的色阶与和谐色，可直接用于背景、文字与强调元素。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ background: base, color: '#ffffff' }}
                  >
                    主按钮
                  </span>
                  <span
                    className="rounded-lg border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: base, color: base }}
                  >
                    次按钮
                  </span>
                  {harmony.slice(1, 4).map((c, i) => (
                    <span
                      key={`chip-${c}-${i}`}
                      className="rounded-lg px-3 py-2 text-xs font-medium"
                      style={{ background: `${c}22`, color: c }}
                    >
                      标签 {i + 1}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <StatGrid
                columns={3}
                items={[
                  { label: '色阶数', value: shades.length, tone: 'primary' },
                  { label: '和谐色', value: harmony.length },
                  { label: '基础色', value: set?.hex ?? base },
                ]}
              />
            </div>
          </Panel>
        </>
      )}
    </ToolView>
  );
}
