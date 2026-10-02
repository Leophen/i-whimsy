'use client';

import * as React from 'react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import {
  NAMED_COLORS,
  hslToRgb,
  isValidColor,
  rgbToHex,
  toColorSet,
  type CMYK,
  type HSL,
  type RGB,
} from '@/lib/core/color';
import { cn } from '@/lib/utils';

const NAMED_ENTRIES = Object.entries(NAMED_COLORS);

export default function ColorConverter() {
  const tool = useToolMeta('color-converter');
  useTrackRecent(tool.slug);

  const [raw, setRaw] = React.useState('#7C5CFF');
  const [alpha, setAlpha] = React.useState(100);
  const [hslDraft, setHslDraft] = React.useState<HSL | null>(null);

  const set = React.useMemo(() => toColorSet(raw), [raw]);
  const valid = isValidColor(raw);

  // 用户手动调过 HSL 时，以草稿为准回写
  const effectiveHex = React.useMemo(() => {
    if (!hslDraft) return set?.hex ?? '#000000';
    return rgbToHex(hslToRgb(hslDraft));
  }, [hslDraft, set]);

  const displaySet = React.useMemo(() => toColorSet(effectiveHex), [effectiveHex]);

  const rgb = displaySet?.rgb ?? { r: 0, g: 0, b: 0 };
  const hsl = displaySet?.hsl ?? { h: 0, s: 0, l: 0 };
  const cmyk = displaySet?.cmyk ?? ({ c: 0, m: 0, y: 0, k: 0 } as CMYK);

  const patchRgb = (key: keyof RGB, value: number) => {
    const next = { ...rgb, [key]: Math.max(0, Math.min(255, value)) } as RGB;
    setRaw(rgbToHex(next));
    setHslDraft(null);
  };

  const patchHsl = (key: keyof HSL, value: number) => {
    const next = { ...hsl, [key]: value } as HSL;
    setHslDraft(next);
  };

  const pickPreset = (hex: string) => {
    setRaw(hex);
    setHslDraft(null);
  };

  const rows: { label: string; value: string }[] = displaySet
    ? [
        { label: 'HEX', value: displaySet.hex },
        { label: 'RGB', value: displaySet.rgbCss },
        {
          label: 'RGBA',
          value: displaySet.rgbaCss.replace(/,\s*1\)$/, `, ${(alpha / 100).toFixed(2)})`),
        },
        { label: 'HSL', value: displaySet.hslCss },
        { label: 'HSV', value: displaySet.hsvCss },
        { label: 'CMYK', value: displaySet.cmykCss },
      ]
    : [];

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={displaySet?.hex ?? ''} sourceLabel="HEX" variant="secondary">
          复制 HEX
        </CopyButton>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <Panel title="输入颜色" description="支持 HEX、rgb()、hsl() 与英文色名">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={effectiveHex.slice(0, 7)}
                onChange={(e) => pickPreset(e.target.value)}
                aria-label="取色器"
                className="h-14 w-20 cursor-pointer rounded-xl border border-border bg-background p-1.5"
              />
              <Input
                value={raw}
                onChange={(e) => {
                  setRaw(e.target.value);
                  setHslDraft(null);
                }}
                placeholder="#7C5CFF 或 rgb(124, 92, 255) 或 rebeccapurple"
                className="flex-1 font-mono text-[13px]"
                spellCheck={false}
                aria-invalid={Boolean(raw) && !valid}
              />
            </div>
            {raw && !valid && (
              <p className="mt-2 text-xs text-danger">无法识别这个颜色值，换种写法试试</p>
            )}

            <div className="mt-4">
              <SliderRow
                label="不透明度 Alpha"
                value={alpha}
                onChange={setAlpha}
                min={0}
                max={100}
                suffix="%"
              />
            </div>

            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <div className="grid grid-cols-3 gap-2">
                {(['r', 'g', 'b'] as const).map((k) => (
                  <Field key={k} label={k.toUpperCase()}>
                    <Input
                      type="number"
                      value={rgb[k]}
                      onChange={(e) => patchRgb(k, Number(e.target.value))}
                      min={0}
                      max={255}
                      className="tabular font-mono text-[13px]"
                    />
                  </Field>
                ))}
              </div>
              <SliderRow
                label="色相 H"
                value={Math.round(hsl.h)}
                onChange={(v) => patchHsl('h', v)}
                min={0}
                max={360}
                suffix="°"
              />
              <SliderRow
                label="饱和度 S"
                value={Math.round(hsl.s)}
                onChange={(v) => patchHsl('s', v)}
                min={0}
                max={100}
                suffix="%"
              />
              <SliderRow
                label="明度 L"
                value={Math.round(hsl.l)}
                onChange={(v) => patchHsl('l', v)}
                min={0}
                max={100}
                suffix="%"
              />
            </div>
          </Panel>
        }
        output={
          <Panel title="全部格式" description="点击任意一行复制">
            {!displaySet ? (
              <Notice tone="danger">无法解析这个颜色</Notice>
            ) : (
              <>
                <div
                  className="relative mb-3 flex h-32 items-end justify-between rounded-xl border border-border p-3"
                  style={{ background: displaySet.hex }}
                >
                  <span className="font-mono text-[13px] font-medium" style={{ color: 'inherit' }}>
                    {displaySet.hex}
                  </span>
                  <span className="rounded-md bg-black/15 px-2 py-1 font-mono text-[11px] text-white">
                    alpha {alpha}%
                  </span>
                </div>

                <StatGrid
                  columns={2}
                  items={[
                    { label: 'CMYK', value: `${cmyk.c}% ${cmyk.m}% ${cmyk.y}% ${cmyk.k}%` },
                    {
                      label: 'HSL',
                      value: `${Math.round(hsl.h)}° ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`,
                    },
                  ]}
                />

                <div className="mt-3 space-y-2">
                  {rows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                    >
                      <span className="w-14 shrink-0 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {r.label}
                      </span>
                      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                        {r.value}
                      </code>
                      <CopyIconButton value={r.value} sourceLabel={`${r.label} 值`} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        }
      />

      <Panel
        title="常用色名速查"
        description={`内置 ${NAMED_ENTRIES.length} 个 CSS 命名色，点击取用`}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {NAMED_ENTRIES.slice(0, 48).map(([name]) => (
            <button
              key={name}
              type="button"
              onClick={() => pickPreset(name)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-left transition-colors',
                'hover:border-primary/40',
                raw.toLowerCase() === name.toLowerCase() && 'border-primary bg-primary-subtle',
              )}
            >
              <span
                className="size-5 shrink-0 rounded border border-border"
                style={{ background: name }}
              />
              <span className="truncate font-mono text-[11px] text-muted-foreground">{name}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          输入框里也可以直接敲色名（如 <code className="font-mono">rebeccapurple</code>、{' '}
          <code className="font-mono">tomato</code>），会自动解析。
        </p>
      </Panel>
    </ToolView>
  );
}
