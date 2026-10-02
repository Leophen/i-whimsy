'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Field, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/controls';
import {
  CSS_UNITS,
  DEFAULT_CSS_CTX,
  convertCssUnit,
  round,
  type CssUnitContext,
  type CssUnitId,
} from '@/lib/core/css';
import { cn } from '@/lib/utils';

const UNIT_OPTIONS = CSS_UNITS.map((u) => ({ value: u.id, label: u.label }));

export default function CssUnitConverter() {
  const tool = useToolMeta('css-unit-converter');
  useTrackRecent(tool.slug);

  const [value, setValue] = React.useState('16');
  const [from, setFrom] = React.useState<CssUnitId>('px');
  const [to, setTo] = React.useState<CssUnitId>('rem');
  const [ctx, setCtx] = React.useState<CssUnitContext>(DEFAULT_CSS_CTX);

  const numeric = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(numeric);

  const result = React.useMemo(() => {
    if (!valid) return null;
    return convertCssUnit(numeric, from, to, ctx);
  }, [valid, numeric, from, to, ctx]);

  const allUnits = React.useMemo(() => {
    if (!valid) return [];
    return CSS_UNITS.map((u) => ({
      id: u.id as CssUnitId,
      label: u.label,
      value: convertCssUnit(numeric, from, u.id, ctx),
    }));
  }, [valid, numeric, from, ctx]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const patchCtx = <K extends keyof CssUnitContext>(key: K, v: number) =>
    setCtx((prev) => ({ ...prev, [key]: v }));

  const needsCtx =
    [from, to].includes('rem') ||
    [from, to].includes('em') ||
    [from, to].includes('vw') ||
    [from, to].includes('vh') ||
    [from, to].includes('percent');

  return (
    <ToolView tool={tool}>
      <Panel title="换算">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              输入
            </span>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="tabular font-mono text-[15px]"
              aria-invalid={!valid}
            />
            <Select
              value={from}
              onValueChange={(v) => setFrom(v as CssUnitId)}
              options={UNIT_OPTIONS}
              size="sm"
            />
          </div>

          <button
            type="button"
            onClick={swap}
            aria-label="交换单位"
            className="mx-auto grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:mb-1"
          >
            <ArrowLeftRight className="size-4" />
          </button>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              结果
            </span>
            <div className="flex h-10 items-center rounded-lg border border-primary/30 bg-primary-subtle px-3">
              <span className="tabular min-w-0 flex-1 truncate font-mono text-[15px] font-semibold text-primary">
                {result === null ? '—' : round(result)}
              </span>
              {result !== null && (
                <CopyIconButton value={String(round(result))} sourceLabel="换算结果" />
              )}
            </div>
            <Select
              value={to}
              onValueChange={(v) => setTo(v as CssUnitId)}
              options={UNIT_OPTIONS}
              size="sm"
            />
          </div>
        </div>

        {result !== null && (
          <div className="mt-4 rounded-xl border border-border bg-background px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="font-mono text-[13px]">
                {round(numeric)}
                {from} = <span className="font-semibold text-primary">{round(result)}</span>
                {to}
              </code>
              <CopyButton
                value={`${round(numeric)}${from} = ${round(result)}${to}`}
                sourceLabel="换算式"
                size="xs"
              >
                复制
              </CopyButton>
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="换算基准"
        description={needsCtx ? '当前换算依赖这些值' : '当前单位组合不依赖视口与字号'}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="根字号 px" hint="rem 的基准">
            <Input
              type="number"
              value={ctx.rootFontSize}
              onChange={(e) => patchCtx('rootFontSize', Number(e.target.value) || 16)}
              className="tabular font-mono text-[13px]"
            />
          </Field>
          <Field label="父级字号 px" hint="em / % 的基准">
            <Input
              type="number"
              value={ctx.parentFontSize}
              onChange={(e) => patchCtx('parentFontSize', Number(e.target.value) || 16)}
              className="tabular font-mono text-[13px]"
            />
          </Field>
          <Field label="视口宽 px" hint="vw 的基准">
            <Input
              type="number"
              value={ctx.viewportWidth}
              onChange={(e) => patchCtx('viewportWidth', Number(e.target.value) || 1920)}
              className="tabular font-mono text-[13px]"
            />
          </Field>
          <Field label="视口高 px" hint="vh 的基准">
            <Input
              type="number"
              value={ctx.viewportHeight}
              onChange={(e) => patchCtx('viewportHeight', Number(e.target.value) || 1080)}
              className="tabular font-mono text-[13px]"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[
            { label: '1920×1080', w: 1920, h: 1080 },
            { label: '1440×900', w: 1440, h: 900 },
            { label: '768×1024', w: 768, h: 1024 },
            { label: '390×844', w: 390, h: 844 },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() =>
                setCtx((prev) => ({ ...prev, viewportWidth: p.w, viewportHeight: p.h }))
              }
              className={cn(
                'rounded-md border px-2.5 py-1 text-[11px] transition-colors',
                ctx.viewportWidth === p.w && ctx.viewportHeight === p.h
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border text-muted-foreground hover:border-border-strong',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Panel>

      {allUnits.length > 0 && (
        <Panel title="全部单位对照" description={`${round(numeric)}${from} 换算到所有单位`}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {allUnits.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => navigator.clipboard?.writeText(`${round(u.value)}${u.id}`)}
                title={`复制 ${round(u.value)}${u.id}`}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition-colors',
                  u.id === to
                    ? 'border-primary/40 bg-primary-subtle'
                    : 'border-border bg-background hover:border-primary/30',
                )}
              >
                <div className="text-[11px] text-muted-foreground">{u.label.split(' ')[0]}</div>
                <div className="tabular mt-0.5 truncate font-mono text-[13px] font-medium">
                  {round(u.value)}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      <StatGrid
        columns={3}
        items={[
          { label: '1rem 等于', value: `${ctx.rootFontSize}px` },
          { label: '1vw 等于', value: `${round(ctx.viewportWidth / 100, 2)}px`, tone: 'primary' },
          { label: '1vh 等于', value: `${round(ctx.viewportHeight / 100, 2)}px` },
        ]}
      />

      <Notice tone="info">
        <div className="space-y-1">
          <div>
            <strong>rem</strong> 相对根元素字号（默认 16px），改{' '}
            <code className="font-mono">
              html{'{'}font-size{'}'}
            </code>{' '}
            会整体缩放；
            <strong>em</strong> 相对父元素字号，嵌套时会层层累积 —— 这也是 em 容易算错的原因。
          </div>
          <div>
            做响应式适配时常用 <code className="font-mono">px → vw</code>： 设计稿 1920px 宽里的
            24px = 24 / 1920 × 100 = 1.25vw。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
