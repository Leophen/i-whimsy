'use client';

import * as React from 'react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import { ADD_UNITS, addDuration, formatDateTime, type AddUnit } from '@/lib/core/datetime';
import { cn } from '@/lib/utils';

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const QUICK: { label: string; amount: number; unit: AddUnit }[] = [
  { label: '+1 周', amount: 1, unit: 'weeks' },
  { label: '+1 个月', amount: 1, unit: 'months' },
  { label: '+3 个月', amount: 3, unit: 'months' },
  { label: '+1 年', amount: 1, unit: 'years' },
  { label: '-1 周', amount: -1, unit: 'weeks' },
  { label: '-1 个月', amount: -1, unit: 'months' },
];

export default function DateCalculator() {
  const tool = useToolMeta('date-calculator');
  useTrackRecent(tool.slug);

  const [base, setBase] = React.useState(() => toLocalInput(new Date()));
  const [amount, setAmount] = React.useState(30);
  const [unit, setUnit] = React.useState<AddUnit>('days');

  const parsed = React.useMemo(() => {
    const d = new Date(base);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [base]);

  const result = React.useMemo(() => {
    if (!parsed) return null;
    return addDuration(parsed, amount, unit);
  }, [parsed, amount, unit]);

  const weekday = React.useMemo(() => {
    if (!result) return '';
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][result.getDay()] ?? '';
  }, [result]);

  return (
    <ToolView tool={tool}>
      <Panel title="基准日期" description="在这个日期上做加减">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="基准时间">
            <Input
              type="datetime-local"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="font-mono text-[13px]"
            />
          </Field>
          <Field label="增减数量" hint="填负数表示往前推">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="tabular font-mono text-[13px]"
            />
          </Field>
        </div>

        <div className="mt-4">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            单位
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ADD_UNITS.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUnit(u.value)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  unit === u.value
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <SegmentedControl
            size="sm"
            value={String(amount)}
            onValueChange={(v) => {
              const q = QUICK.find((x) => String(x.amount) === v);
              if (q) {
                setAmount(q.amount);
                setUnit(q.unit);
              }
            }}
            options={QUICK.map((q) => ({ value: String(q.amount), label: q.label }))}
          />
        </div>
      </Panel>

      {result && parsed ? (
        <>
          <Panel
            title="推算结果"
            description={`${formatDateTime(parsed)} ${amount >= 0 ? '+' : '-'} ${Math.abs(amount)} ${
              ADD_UNITS.find((u) => u.value === unit)?.label ?? ''
            }`}
            actions={
              <CopyButton value={formatDateTime(result)} sourceLabel="推算结果" size="xs">
                复制
              </CopyButton>
            }
          >
            <div className="rounded-xl border border-primary/25 bg-primary-subtle p-4 text-center">
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                结果日期
              </div>
              <div className="tabular mt-1 text-2xl font-semibold text-primary sm:text-3xl">
                {formatDateTime(result)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{weekday}</div>
            </div>

            <div className="mt-3 space-y-2">
              {[
                { label: 'ISO 8601', value: result.toISOString() },
                { label: 'UTC', value: result.toUTCString() },
                { label: '时间戳（秒）', value: String(Math.floor(result.getTime() / 1000)) },
                { label: '时间戳（毫秒）', value: String(result.getTime()) },
                { label: '日期部分', value: result.toLocaleDateString('zh-CN') },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                >
                  <span className="w-28 shrink-0 text-[11px] font-medium text-muted-foreground">
                    {r.label}
                  </span>
                  <code className="min-w-0 flex-1 truncate text-right font-mono text-[13px]">
                    {r.value}
                  </code>
                  <CopyIconButton value={r.value} sourceLabel={r.label} />
                </div>
              ))}
            </div>
          </Panel>

          <StatGrid
            columns={3}
            items={[
              { label: '基准', value: formatDateTime(parsed) },
              { label: '间隔', value: `${amount > 0 ? '+' : ''}${amount}` },
              {
                label: '相差天数',
                value: Math.round((result.getTime() - parsed.getTime()) / 86400000),
                tone: 'primary',
              },
            ]}
          />

          <Notice tone="info">
            加月份时会处理月末边界：1 月 31 日 +1 个月 = 2 月 28 日（闰年 29 日），不会溢出到 3 月。
            算订阅到期、试用期截止、发版窗口时最常用。
          </Notice>
        </>
      ) : (
        <Notice tone="danger">请输入有效的基准日期</Notice>
      )}
    </ToolView>
  );
}
