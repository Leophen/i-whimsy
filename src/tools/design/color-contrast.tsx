'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import {
  checkContrast,
  isValidColor,
  parseColor,
  readableTextColor,
  rgbToHex,
  type WcagLevel,
} from '@/lib/core/color';
import { cn } from '@/lib/utils';

const PRESETS: { fg: string; bg: string; label: string }[] = [
  { fg: '#1d1d1f', bg: '#ffffff', label: '黑白（最稳）' },
  { fg: '#7c5cff', bg: '#ffffff', label: '紫字白底' },
  { fg: '#ffffff', bg: '#7c5cff', label: '白字紫底' },
  { fg: '#767679', bg: '#ffffff', label: '次要文字' },
  { fg: '#ff6b6b', bg: '#fff5f5', label: '错误提示' },
  { fg: '#2f855a', bg: '#f0fff4', label: '成功提示' },
];

const LEVEL_TONE: Record<WcagLevel, 'success' | 'warning' | 'danger'> = {
  AAA: 'success',
  AA: 'success',
  'AA Large': 'warning',
  Fail: 'danger',
};

export default function ColorContrast() {
  const tool = useToolMeta('color-contrast');
  useTrackRecent(tool.slug);

  const [fg, setFg] = React.useState('#7c5cff');
  const [bg, setBg] = React.useState('#ffffff');
  const [size, setSize] = React.useState<'normal' | 'large'>('normal');
  const [sample, setSample] = React.useState('前端工具库 iWhimsy');

  const result = React.useMemo(() => checkContrast(fg, bg), [fg, bg]);
  const validFg = isValidColor(fg);
  const validBg = isValidColor(bg);
  const suggested = React.useMemo(() => readableTextColor(bg), [bg]);

  const criteria = result
    ? [
        {
          label: '普通文本 AA',
          threshold: '≥ 4.5',
          pass: result.normalAA,
          note: '小于 18pt 的正文，WCAG 最低要求',
        },
        {
          label: '普通文本 AAA',
          threshold: '≥ 7',
          pass: result.normalAAA,
          note: '增强级，长文阅读更友好',
        },
        {
          label: '大文本 AA',
          threshold: '≥ 3',
          pass: result.largeAA,
          note: '≥ 18pt 或 ≥ 14pt 加粗',
        },
        {
          label: 'UI 组件 AA',
          threshold: '≥ 3',
          pass: result.uiAA,
          note: '图标、边框、输入框等图形元素',
        },
      ]
    : [];

  return (
    <ToolView tool={tool}>
      <ToolIO
        split="wide-input"
        input={
          <Panel title="前景色 / 背景色" description="支持 HEX、rgb()、hsl() 与色名">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="前景色（文字）">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isValidColor(fg) ? toHexInput(fg) : '#000000'}
                    onChange={(e) => setFg(e.target.value)}
                    aria-label="前景色取色器"
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
                  />
                  <Input
                    value={fg}
                    onChange={(e) => setFg(e.target.value)}
                    className="font-mono text-[13px]"
                    spellCheck={false}
                    aria-invalid={!validFg}
                  />
                </div>
              </Field>
              <Field label="背景色">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isValidColor(bg) ? toHexInput(bg) : '#ffffff'}
                    onChange={(e) => setBg(e.target.value)}
                    aria-label="背景色取色器"
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1"
                  />
                  <Input
                    value={bg}
                    onChange={(e) => setBg(e.target.value)}
                    className="font-mono text-[13px]"
                    spellCheck={false}
                    aria-invalid={!validBg}
                  />
                </div>
              </Field>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                常用组合
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFg(p.fg);
                      setBg(p.bg);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <span className="flex overflow-hidden rounded border border-border">
                      <span className="size-3.5" style={{ background: p.bg }} />
                      <span className="size-3.5" style={{ background: p.fg }} />
                    </span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <Field label="预览文字">
                <Input
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  placeholder="输入要预览的文字…"
                />
              </Field>
            </div>
          </Panel>
        }
        output={
          <Panel title="检查结果" description="按 WCAG 2.1 SC 1.4.3 / 1.4.6 判定">
            {!result ? (
              <Notice tone="danger">颜色值无法解析，请检查输入</Notice>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <div>
                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      对比度
                    </div>
                    <div className="tabular mt-0.5 text-3xl leading-none font-semibold">
                      {result.ratio.toFixed(2)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">范围 1 ~ 21</div>
                  </div>
                  <Badge variant={LEVEL_TONE[result.level]} size="md">
                    {result.level === 'Fail' ? '不达标' : `达标 ${result.level}`}
                  </Badge>
                </div>

                <div className="mt-3">
                  <StatGrid
                    columns={2}
                    items={[
                      {
                        label: '等级',
                        value: result.level,
                        tone:
                          LEVEL_TONE[result.level] === 'success'
                            ? 'success'
                            : LEVEL_TONE[result.level] === 'warning'
                              ? 'warning'
                              : 'danger',
                      },
                      {
                        label: '达标项',
                        value: `${criteria.filter((c) => c.pass).length} / ${criteria.length}`,
                      },
                    ]}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {criteria.map((c) => (
                    <div
                      key={c.label}
                      className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                          c.pass
                            ? 'bg-success-subtle text-success'
                            : 'bg-danger-subtle text-danger',
                        )}
                      >
                        {c.pass ? <Check className="size-3" /> : <X className="size-3" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium">{c.label}</span>
                          <span className="tabular text-xs text-muted-foreground">
                            {c.threshold}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        }
      />

      {result && (
        <>
          <Panel title="真实预览" description="按当前配色渲染实际文字效果">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedControl
                size="sm"
                value={size}
                onValueChange={setSize}
                options={[
                  { value: 'normal', label: '正文 16px' },
                  { value: 'large', label: '大文本 24px' },
                ]}
              />
              <CopyButton
                value={`fg: ${fg} · bg: ${bg} · ratio: ${result.ratio.toFixed(2)}`}
                sourceLabel="检查结论"
                size="xs"
              >
                复制结论
              </CopyButton>
            </div>

            <div
              className="mt-3 rounded-xl border border-border p-6"
              style={{ background: bg, color: fg }}
            >
              <p className={size === 'large' ? 'text-2xl font-semibold' : 'text-base'}>
                {sample || '前端工具库 iWhimsy'}
              </p>
              <p
                className={cn('mt-2', size === 'large' ? 'text-lg' : 'text-sm')}
                style={{ opacity: 0.85 }}
              >
                这是一段稍长的正文，用来判断在真实阅读场景下的可读性。
              </p>
              <div className="mt-4 flex gap-2">
                <span
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium',
                    size === 'large' ? 'text-base' : '',
                  )}
                  style={{ border: `1px solid ${fg}` }}
                >
                  描边按钮
                </span>
              </div>
            </div>
          </Panel>

          <Notice tone={result.level === 'Fail' ? 'warning' : 'info'}>
            <div className="space-y-1">
              <div>
                在这个背景上，系统推荐的可读文字色是 <code className="font-mono">{suggested}</code>
                <button
                  type="button"
                  onClick={() => setFg(suggested)}
                  className="ml-2 rounded-md border border-border px-2 py-0.5 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                >
                  用它
                </button>
              </div>
              <div>
                对比度按 WCAG 相对亮度公式计算：先把 sRGB 通道线性化，再算 (L1+0.05)/(L2+0.05)。
                半透明前景会先与背景做 alpha 合成再计算，和实际渲染一致。
              </div>
            </div>
          </Notice>
        </>
      )}
    </ToolView>
  );
}

/** 把任意合法颜色值转成 <input type="color"> 需要的 #rrggbb */
function toHexInput(input: string): string {
  const parsed = parseColor(input);
  return parsed ? rgbToHex({ r: parsed.r, g: parsed.g, b: parsed.b }) : '#000000';
}
