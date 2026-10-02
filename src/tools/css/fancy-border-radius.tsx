'use client';

import * as React from 'react';
import { Shuffle } from 'lucide-react';

import { CopyButton, ResetButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { DEFAULT_RADIUS, buildRadiusCss, type RadiusParams } from '@/lib/core/css';

type CornerKey = 'tl' | 'tr' | 'br' | 'bl' | 'tlV' | 'trV' | 'brV' | 'blV';

const CORNERS: { h: CornerKey; v: CornerKey; label: string }[] = [
  { h: 'tl', v: 'tlV', label: '左上' },
  { h: 'tr', v: 'trV', label: '右上' },
  { h: 'br', v: 'brV', label: '右下' },
  { h: 'bl', v: 'blV', label: '左下' },
];

const PRESETS: { name: string; params: RadiusParams }[] = [
  { name: '叶片', params: { ...DEFAULT_RADIUS, tl: 100, tr: 0, br: 100, bl: 0 } },
  { name: '水滴', params: { ...DEFAULT_RADIUS, tl: 100, tr: 100, br: 100, bl: 0 } },
  {
    name: '花瓣',
    params: {
      ...DEFAULT_RADIUS,
      tl: 70,
      tr: 30,
      br: 70,
      bl: 30,
      tlV: 30,
      trV: 70,
      brV: 30,
      blV: 70,
    },
  },
  { name: '胶囊', params: { ...DEFAULT_RADIUS, tl: 50, tr: 50, br: 50, bl: 50, height: 120 } },
  { name: '椭圆', params: { ...DEFAULT_RADIUS, tl: 50, tr: 50, br: 50, bl: 50 } },
  { name: '对话气泡', params: { ...DEFAULT_RADIUS, tl: 40, tr: 40, br: 0, bl: 40 } },
];

const rand = () => Math.round(20 + Math.random() * 80);

export default function FancyBorderRadius() {
  const tool = useToolMeta('fancy-border-radius');
  useTrackRecent(tool.slug);

  const [p, setP] = React.useState<RadiusParams>(DEFAULT_RADIUS);
  const [color, setColor] = React.useState('#7c5cff');
  const patch = (next: Partial<RadiusParams>) => setP((prev) => ({ ...prev, ...next }));
  /** 圆角字段全是 number，逐键赋值可避免计算属性键带来的类型放宽 */
  const setCorner = (key: CornerKey, value: number) =>
    setP((prev) => {
      const next: RadiusParams = { ...prev };
      next[key] = value;
      return next;
    });

  const radius = buildRadiusCss(p);
  const css = `width: ${p.width}px;\nheight: ${p.height}px;\nborder-radius: ${radius};`;

  const randomize = () =>
    setP((prev) => ({
      ...prev,
      tl: rand(),
      tr: rand(),
      br: rand(),
      bl: rand(),
      tlV: rand(),
      trV: rand(),
      brV: rand(),
      blV: rand(),
    }));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ResetButton onReset={() => setP(DEFAULT_RADIUS)} />
          <CopyButton value={css} sourceLabel="CSS 代码" variant="secondary">
            复制 CSS
          </CopyButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <Panel
          title="四个角"
          description="每角的水平 / 垂直半径可分别设定，做出非对称的有机形状"
          actions={
            <button
              type="button"
              onClick={randomize}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Shuffle className="size-3" />
              随机
            </button>
          }
        >
          <div className="space-y-4">
            {CORNERS.map((c) => (
              <div
                key={c.label}
                className="space-y-2 rounded-xl border border-border bg-background p-3"
              >
                <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {c.label}
                </span>
                <SliderRow
                  label="水平"
                  value={p[c.h]}
                  onChange={(v) => setCorner(c.h, v)}
                  min={0}
                  max={100}
                  suffix=" %"
                />
                <SliderRow
                  label="垂直"
                  value={p[c.v]}
                  onChange={(v) => setCorner(c.v, v)}
                  min={0}
                  max={100}
                  suffix=" %"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3.5 border-t border-border pt-3.5">
            <SliderRow
              label="宽度"
              value={p.width}
              onChange={(v) => patch({ width: v })}
              min={80}
              max={480}
              suffix=" px"
            />
            <SliderRow
              label="高度"
              value={p.height}
              onChange={(v) => patch({ height: v })}
              min={80}
              max={480}
              suffix=" px"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">颜色</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="形状颜色"
                className="h-8 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
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
          <Panel title="实时预览">
            <div className="grid min-h-80 place-items-center rounded-xl border border-border bg-surface-2 p-8">
              <div
                style={{
                  width: `${p.width}px`,
                  height: `${p.height}px`,
                  borderRadius: radius,
                  background: `linear-gradient(135deg, ${color}, ${color}99)`,
                  boxShadow: `0 12px 32px ${color}33`,
                  maxWidth: '100%',
                }}
              />
            </div>
            <div className="mt-3">
              <StatGrid
                columns={3}
                items={[
                  { label: '尺寸', value: `${p.width}×${p.height}` },
                  {
                    label: '圆角写法',
                    value: radius.includes('/') ? '八值' : '四值',
                    tone: 'primary',
                  },
                  { label: '最大角', value: `${Math.max(p.tl, p.tr, p.br, p.bl)}%` },
                ]}
              />
            </div>
          </Panel>

          <Panel
            title="CSS 代码"
            actions={
              <CopyButton value={css} sourceLabel="CSS" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">
              {css}
            </pre>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              八值写法的语义是{' '}
              <code className="font-mono">tl-h tr-h br-h bl-h / tl-v tr-v br-v bl-v</code>，
              百分比按元素自身的宽 / 高分别计算，所以同一个值在宽高不等的盒子上会呈现不同的弧度。
            </p>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
