'use client';

import * as React from 'react';
import { Plus, Shuffle, Trash2 } from 'lucide-react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { generateHarmony } from '@/lib/core/color';
import { cn } from '@/lib/utils';

interface Stop {
  id: string;
  color: string;
  position: number;
}

const uid = () => Math.random().toString(36).slice(2, 9);

const PRESETS: { name: string; type: 'linear' | 'radial'; angle: number; stops: string[] }[] = [
  { name: '紫罗兰', type: 'linear', angle: 135, stops: ['#7c5cff', '#c084fc', '#f0abfc'] },
  { name: '日落', type: 'linear', angle: 120, stops: ['#ff6b6b', '#ffa94d', '#ffd43b'] },
  { name: '海洋', type: 'linear', angle: 160, stops: ['#0ea5e9', '#22d3ee', '#a7f3d0'] },
  { name: '薄荷', type: 'linear', angle: 135, stops: ['#34d399', '#6ee7b7', '#d1fae5'] },
  { name: '午夜', type: 'linear', angle: 180, stops: ['#111827', '#312e81', '#7c3aed'] },
  { name: '玫瑰', type: 'radial', angle: 0, stops: ['#f43f5e', '#fb7185', '#fecdd3'] },
];

export default function GradientGenerator() {
  const tool = useToolMeta('gradient-generator');
  useTrackRecent(tool.slug);

  const [type, setType] = React.useState<'linear' | 'radial'>('linear');
  const [angle, setAngle] = React.useState(135);
  const [stops, setStops] = React.useState<Stop[]>([
    { id: uid(), color: '#7c5cff', position: 0 },
    { id: uid(), color: '#c084fc', position: 50 },
    { id: uid(), color: '#f0abfc', position: 100 },
  ]);

  const sorted = React.useMemo(() => [...stops].sort((a, b) => a.position - b.position), [stops]);

  const gradient = React.useMemo(() => {
    const list = sorted.map((s) => `${s.color} ${s.position}%`).join(', ');
    return type === 'linear'
      ? `linear-gradient(${angle}deg, ${list})`
      : `radial-gradient(circle, ${list})`;
  }, [sorted, type, angle]);

  const cssCode = `background: ${gradient};`;
  const tailwindCode = `bg-[${type === 'linear' ? `linear-gradient(${angle}deg` : 'radial-gradient(circle'},${sorted.map((s) => `${s.color.replace('#', '%23')}_${s.position}%`).join(',')})]`;

  const patchStop = (id: string, patch: Partial<Stop>) =>
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addStop = () => {
    const max = stops.reduce((m, s) => Math.max(m, s.position), 0);
    const color =
      generateHarmony(sorted[sorted.length - 1]?.color ?? '#7c5cff', 'analogous')[1] ?? '#a78bfa';
    setStops((prev) => [...prev, { id: uid(), color, position: Math.min(100, max + 10) }]);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setType(p.type);
    setAngle(p.angle);
    setStops(
      p.stops.map((c, i) => ({
        id: uid(),
        color: c,
        position: Math.round((i / Math.max(1, p.stops.length - 1)) * 100),
      })),
    );
  };

  const randomize = () => {
    const base = `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`;
    const harmony = generateHarmony(base, 'analogous');
    setStops(
      [0, 50, 100].map((pos, i) => ({
        id: uid(),
        color: harmony[i] ?? base,
        position: pos,
      })),
    );
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={randomize}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Shuffle className="size-3.5" />
            随机
          </button>
          <CopyButton value={cssCode} sourceLabel="CSS 代码" variant="secondary">
            复制 CSS
          </CopyButton>
        </>
      }
    >
      <Panel title="实时预览" description="拖动色标或改角度，预览立即更新">
        <div
          className="h-56 rounded-xl border border-border"
          style={{ background: gradient }}
          aria-label="渐变预览"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            size="sm"
            value={type}
            onValueChange={setType}
            options={[
              { value: 'linear', label: '线性' },
              { value: 'radial', label: '径向' },
            ]}
          />
          {type === 'linear' && (
            <div className="flex items-center gap-3">
              <SliderRow
                label="角度"
                value={angle}
                onChange={setAngle}
                min={0}
                max={360}
                suffix="°"
                className="w-56"
              />
              <div className="flex gap-1">
                {[0, 45, 90, 135, 180, 270].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAngle(a)}
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-[11px] transition-colors',
                      angle === a
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border text-muted-foreground hover:border-border-strong',
                    )}
                  >
                    {a}°
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <Panel
          title="色标"
          description={`共 ${stops.length} 个停靠点，最少保留 2 个`}
          actions={
            <button
              type="button"
              onClick={addStop}
              disabled={stops.length >= 8}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <Plus className="size-3" />
              添加
            </button>
          }
        >
          <div className="space-y-3">
            {sorted.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-2.5"
              >
                <input
                  type="color"
                  value={s.color}
                  onChange={(e) => patchStop(s.id, { color: e.target.value })}
                  aria-label="色标颜色"
                  className="h-9 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
                <input
                  value={s.color}
                  onChange={(e) => patchStop(s.id, { color: e.target.value })}
                  className="h-9 w-24 rounded-lg border border-border bg-background px-2 font-mono text-[12px] focus:border-primary focus:outline-none"
                  spellCheck={false}
                />
                <div className="flex-1">
                  <SliderRow
                    label="位置"
                    value={s.position}
                    onChange={(v) => patchStop(s.id, { position: v })}
                    min={0}
                    max={100}
                    suffix="%"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStop(s.id)}
                  disabled={stops.length <= 2}
                  aria-label="删除色标"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              预设
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <span
                    className="size-4 rounded"
                    style={{
                      background:
                        p.type === 'linear'
                          ? `linear-gradient(${p.angle}deg, ${p.stops.join(', ')})`
                          : `radial-gradient(circle, ${p.stops.join(', ')})`,
                    }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="CSS 代码"
            actions={
              <CopyButton value={cssCode} sourceLabel="CSS" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[12px] leading-relaxed">
              {cssCode}
            </pre>
            <StatGrid
              columns={2}
              className="mt-3"
              items={[
                { label: '类型', value: type === 'linear' ? '线性' : '径向' },
                { label: '色标数', value: stops.length, tone: 'primary' },
              ]}
            />
          </Panel>

          <Panel
            title="Tailwind 任意值写法"
            actions={<CopyIconButton value={tailwindCode} sourceLabel="Tailwind 类名" />}
          >
            <pre className="overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed break-all">
              {tailwindCode}
            </pre>
            <Notice tone="info" className="mt-3">
              Tailwind 任意值里空格要写成下划线、<code className="font-mono">#</code> 要转义成{' '}
              <code className="font-mono">%23</code>。渐变这种复杂值更推荐写进{' '}
              <code className="font-mono">theme.extend</code> 或直接用 style 属性。
            </Notice>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
