'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { buildShadowCss, type ShadowLayer } from '@/lib/core/css';
import { cn } from '@/lib/utils';

let seq = 0;
const nextId = () => `layer-${(seq += 1)}`;

const PRESETS: { name: string; layers: Omit<ShadowLayer, 'id'>[] }[] = [
  {
    name: '柔和',
    layers: [{ x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(0,0,0,0.08)', inset: false }],
  },
  {
    name: '卡片',
    layers: [
      { x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.06)', inset: false },
      { x: 0, y: 8, blur: 24, spread: -4, color: 'rgba(0,0,0,0.10)', inset: false },
    ],
  },
  {
    name: '悬浮',
    layers: [
      { x: 0, y: 12, blur: 28, spread: -6, color: 'rgba(0,0,0,0.15)', inset: false },
      { x: 0, y: 2, blur: 6, spread: 0, color: 'rgba(0,0,0,0.06)', inset: false },
    ],
  },
  {
    name: '新拟态',
    layers: [
      { x: 6, y: 6, blur: 12, spread: 0, color: 'rgba(163,177,198,0.6)', inset: false },
      { x: -6, y: -6, blur: 12, spread: 0, color: 'rgba(255,255,255,0.9)', inset: false },
    ],
  },
  {
    name: '内凹',
    layers: [{ x: 0, y: 2, blur: 6, spread: 0, color: 'rgba(0,0,0,0.18)', inset: true }],
  },
];

export default function BoxShadowGenerator() {
  const tool = useToolMeta('box-shadow-generator');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'box' | 'text'>('box');
  const [layers, setLayers] = React.useState<ShadowLayer[]>([
    { id: nextId(), x: 0, y: 8, blur: 24, spread: -4, color: 'rgba(0,0,0,0.12)', inset: false },
  ]);
  const [activeId, setActiveId] = React.useState(() => layers[0]!.id);
  const [bg, setBg] = React.useState('#f5f5f7');
  const [boxColor, setBoxColor] = React.useState('#ffffff');

  const active = layers.find((l) => l.id === activeId) ?? layers[0]!;
  const css = buildShadowCss(layers);
  const declaration = mode === 'box' ? `box-shadow: ${css};` : `text-shadow: ${css};`;

  const patch = (id: string, p: Partial<ShadowLayer>) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const addLayer = () => {
    const l: ShadowLayer = {
      id: nextId(),
      x: 0,
      y: 4,
      blur: 12,
      spread: 0,
      color: 'rgba(0,0,0,0.10)',
      inset: false,
    };
    setLayers((prev) => [...prev, l]);
    setActiveId(l.id);
  };

  const removeLayer = (id: string) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeId === id) setActiveId(layers.find((l) => l.id !== id)!.id);
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const next = p.layers.map((l) => ({ ...l, id: nextId() }));
    setLayers(next);
    setActiveId(next[0]!.id);
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={declaration} sourceLabel="CSS 代码" variant="secondary">
          复制 CSS
        </CopyButton>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <SegmentedControl
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'box', label: 'box-shadow' },
            { value: 'text', label: 'text-shadow' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            背景
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              aria-label="预览背景色"
              className="h-8 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
            />
          </label>
          {mode === 'box' && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              元素色
              <input
                type="color"
                value={boxColor}
                onChange={(e) => setBoxColor(e.target.value)}
                aria-label="预览元素色"
                className="h-8 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
            </label>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        <Panel
          title="阴影图层"
          description={`共 ${layers.length} 层，点选某层进行编辑`}
          actions={
            <button
              type="button"
              onClick={addLayer}
              disabled={layers.length >= 5}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <Plus className="size-3" />
              加一层
            </button>
          }
        >
          <div className="space-y-2">
            {layers.map((l, i) => (
              <div
                key={l.id}
                className={cn(
                  'rounded-xl border px-3 py-2 transition-colors',
                  l.id === activeId
                    ? 'border-primary/50 bg-primary-subtle'
                    : 'border-border bg-background hover:border-primary/25',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveId(l.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded bg-surface-2 text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                      {l.inset ? 'inset ' : ''}
                      {l.x}px {l.y}px {l.blur}px {l.spread}px {l.color}
                    </code>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => patch(l.id, { inset: !l.inset })}
                      aria-pressed={l.inset}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] transition-colors',
                        l.inset
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-muted-foreground hover:border-border-strong',
                      )}
                    >
                      inset
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLayer(l.id)}
                      disabled={layers.length <= 1}
                      aria-label="删除该层"
                      className="grid size-6 place-items-center rounded text-muted-foreground transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-40"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3.5 border-t border-border pt-3.5">
            <SliderRow
              label="水平偏移 X"
              value={active.x}
              onChange={(v) => patch(active.id, { x: v })}
              min={-60}
              max={60}
              suffix=" px"
            />
            <SliderRow
              label="垂直偏移 Y"
              value={active.y}
              onChange={(v) => patch(active.id, { y: v })}
              min={-60}
              max={60}
              suffix=" px"
            />
            <SliderRow
              label="模糊 Blur"
              value={active.blur}
              onChange={(v) => patch(active.id, { blur: v })}
              min={0}
              max={120}
              suffix=" px"
            />
            <SliderRow
              label="扩散 Spread"
              value={active.spread}
              onChange={(v) => patch(active.id, { spread: v })}
              min={-60}
              max={60}
              suffix=" px"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">颜色</span>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(active.color) ? active.color : '#000000'}
                onChange={(e) => patch(active.id, { color: e.target.value })}
                aria-label="阴影颜色"
                className="h-8 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <input
                value={active.color}
                onChange={(e) => patch(active.id, { color: e.target.value })}
                className="h-8 flex-1 rounded-lg border border-border bg-background px-2 font-mono text-[11px] focus:border-primary focus:outline-none"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-3.5">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              预设
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="实时预览">
            <div
              className="flex min-h-64 items-center justify-center rounded-xl border border-border p-10"
              style={{ background: bg }}
            >
              {mode === 'box' ? (
                <div
                  className="grid size-40 place-items-center rounded-2xl text-sm font-medium"
                  style={{ background: boxColor, boxShadow: css, color: '#333' }}
                >
                  预览卡片
                </div>
              ) : (
                <div className="text-4xl font-bold" style={{ color: boxColor, textShadow: css }}>
                  预览文字
                </div>
              )}
            </div>
          </Panel>

          <Panel
            title="CSS 代码"
            actions={
              <CopyButton value={declaration} sourceLabel="CSS" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-relaxed break-all">
              {declaration}
            </pre>
            <div className="mt-3">
              <StatGrid
                columns={3}
                items={[
                  { label: '层数', value: layers.length, tone: 'primary' },
                  {
                    label: 'inset 层',
                    value: layers.filter((l) => l.inset).length,
                  },
                  { label: '最大模糊', value: `${Math.max(...layers.map((l) => l.blur))}px` },
                ]}
              />
            </div>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
