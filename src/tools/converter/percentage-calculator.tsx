'use client';

import * as React from 'react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { RadioGroup } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import { calculatePercent, type PercentMode } from '@/lib/core/convert';
import { trimNumber } from '@/lib/utils';

interface ModeDef {
  value: PercentMode;
  label: string;
  aLabel: string;
  bLabel: string;
  formula: string;
  example: string;
}

const MODES: ModeDef[] = [
  {
    value: 'percentOf',
    label: 'X 占 Y 的百分之几',
    aLabel: 'X（部分）',
    bLabel: 'Y（整体）',
    formula: '(X ÷ Y) × 100%',
    example: '30 占 150 的 20%',
  },
  {
    value: 'ratioOf',
    label: 'Y 的 X% 是多少',
    aLabel: 'X（百分比）',
    bLabel: 'Y（基数）',
    formula: 'Y × X%',
    example: '200 的 15% = 30',
  },
  {
    value: 'increase',
    label: 'Y 增加 X% 后是多少',
    aLabel: 'X（百分比）',
    bLabel: 'Y（原值）',
    formula: 'Y × (1 + X%)',
    example: '100 涨价 20% = 120',
  },
  {
    value: 'decrease',
    label: 'Y 减少 X% 后是多少',
    aLabel: 'X（百分比）',
    bLabel: 'Y（原值）',
    formula: 'Y × (1 − X%)',
    example: '100 打 8 折 = 80',
  },
  {
    value: 'changeTo',
    label: 'A 到 B 的变化率',
    aLabel: 'A（原值）',
    bLabel: 'B（新值）',
    formula: '(B − A) ÷ A × 100%',
    example: '80 → 100 增长 25%',
  },
  {
    value: 'changeFrom',
    label: 'B 相对 A 的变化率',
    aLabel: 'A（基准）',
    bLabel: 'B（比较值）',
    formula: '(A − B) ÷ B × 100%',
    example: '100 相对 80 多 25%',
  },
];

export default function PercentageCalculator() {
  const tool = useToolMeta('percentage-calculator');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<PercentMode>('percentOf');
  const [a, setA] = React.useState('30');
  const [b, setB] = React.useState('150');

  const def = MODES.find((m) => m.value === mode)!;

  const result = React.useMemo(() => {
    const na = Number(a);
    const nb = Number(b);
    if (a.trim() === '' || b.trim() === '') return null;
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return null;
    if (nb === 0 && mode === 'percentOf') return null;
    if (na === 0 && mode === 'changeTo') return null;
    if (nb === 0 && mode === 'changeFrom') return null;
    return calculatePercent(mode, na, nb);
  }, [mode, a, b]);

  const isRate = mode === 'percentOf' || mode === 'changeTo' || mode === 'changeFrom';

  return (
    <ToolView tool={tool}>
      <Panel title="选择计算类型">
        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as PercentMode)}
          options={MODES.map((m) => ({ value: m.value, label: m.label }))}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="输入数值" description={def.example}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={def.aLabel}>
              <Input
                type="number"
                value={a}
                onChange={(e) => setA(e.target.value)}
                className="tabular font-mono text-[15px]"
              />
            </Field>
            <Field label={def.bLabel}>
              <Input
                type="number"
                value={b}
                onChange={(e) => setB(e.target.value)}
                className="tabular font-mono text-[15px]"
              />
            </Field>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-surface-2 px-3.5 py-3">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              计算公式
            </div>
            <code className="mt-1 block font-mono text-[13px]">{def.formula}</code>
          </div>
        </Panel>

        <Panel
          title="计算结果"
          actions={
            result !== null && (
              <CopyButton value={String(trimNumber(result))} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            )
          }
        >
          {result === null ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              请输入有效的数值（除法的分母不能为 0）
            </p>
          ) : (
            <>
              <div className="rounded-xl border border-primary/25 bg-primary-subtle p-5 text-center">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {def.label}
                </div>
                <div className="tabular mt-1.5 text-3xl font-semibold text-primary">
                  {trimNumber(result)}
                  {isRate ? '%' : ''}
                </div>
              </div>

              <div className="mt-3">
                <StatGrid
                  columns={2}
                  items={[
                    { label: def.aLabel.split('（')[0], value: trimNumber(Number(a)) },
                    { label: def.bLabel.split('（')[0], value: trimNumber(Number(b)) },
                  ]}
                />
              </div>
            </>
          )}
        </Panel>
      </div>

      <Notice tone="info">
        <div className="space-y-1">
          <div>
            <strong>增长率</strong>的分母是「原来的值」，<strong>减少率</strong>同理 —— 从 50 涨到
            100 是 +100%，从 100 跌回 50 只是 −50%，别搞混基准。
          </div>
          <div>折扣场景用「Y 减少 X%」：打 8 折 = 减少 20%。</div>
        </div>
      </Notice>
    </ToolView>
  );
}
