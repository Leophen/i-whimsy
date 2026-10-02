'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { diffDates, toIsoDuration } from '@/lib/core/datetime';
import { formatDateTime } from '@/lib/core/datetime';

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const YEARS = Array.from({ length: 11 }, (_, i) => 2026 + i - 5);

export default function DateDiff() {
  const tool = useToolMeta('date-diff');
  useTrackRecent(tool.slug);

  const [start, setStart] = React.useState(() => toLocalInput(new Date(2026, 0, 1, 0, 0)));
  const [end, setEnd] = React.useState(() => toLocalInput(new Date(2026, 9, 2, 0, 0)));

  const result = React.useMemo(() => {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    return diffDates(s, e);
  }, [start, end]);

  const swap = () => {
    setStart(end);
    setEnd(start);
  };

  const useToday = () => setEnd(toLocalInput(new Date()));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={swap}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            交换
          </button>
          <button
            type="button"
            onClick={useToday}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            结束设为今天
          </button>
        </>
      }
    >
      <Panel title="选择两个日期">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="开始时间">
            <Input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="font-mono text-[13px]"
            />
          </Field>
          <Field label="结束时间">
            <Input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="font-mono text-[13px]"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setStart(`${y}-01-01T00:00`)}
              className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {y} 年初
            </button>
          ))}
        </div>
      </Panel>

      {result ? (
        <>
          <Panel
            title="相差多久"
            description={result.humanized}
            actions={
              <CopyButton
                value={`${formatDateTime(new Date(start))} → ${formatDateTime(new Date(end))}\n${result.humanized}\n总天数 ${result.totalDays} 天 · 工作日 ${result.workdays} 天`}
                sourceLabel="计算结果"
                size="xs"
              >
                复制结论
              </CopyButton>
            }
          >
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: '年', value: result.years },
                { label: '月', value: result.months },
                { label: '日', value: result.days },
                { label: '时', value: result.hours },
                { label: '分', value: result.minutes },
                { label: '秒', value: result.seconds },
              ].map((u) => (
                <div
                  key={u.label}
                  className="rounded-xl border border-border bg-background px-3 py-3 text-center"
                >
                  <div className="text-[11px] text-muted-foreground">{u.label}</div>
                  <div className="tabular mt-0.5 text-xl font-semibold">{u.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <StatGrid
                columns={4}
                items={[
                  { label: '总天数', value: result.totalDays, tone: 'primary' },
                  { label: '总小时', value: Math.round(result.totalHours) },
                  { label: '工作日', value: result.workdays, tone: 'success' },
                  { label: '周末天数', value: result.weekends, tone: 'warning' },
                ]}
              />
            </div>

            <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  ISO 8601 时长
                </span>
                <Badge variant="neutral" size="sm">
                  可直接使用
                </Badge>
              </div>
              <code className="mt-1.5 block break-all font-mono text-[13px]">
                {toIsoDuration(result)}
              </code>
            </div>
          </Panel>

          <Notice tone="info">
            <div className="space-y-1">
              <div>
                <strong>年 / 月 / 日</strong> 按自然日历拆分（会考虑每月天数不同、闰年），
                <strong>总天数</strong> 才是简单的时间差除以一天。
              </div>
              <div>
                工作日只排除周六周日，<strong>不</strong>包含法定节假日 ——
                精确工期需要再手动扣掉放假。
              </div>
            </div>
          </Notice>
        </>
      ) : (
        <Notice tone="danger">请输入有效的日期时间</Notice>
      )}
    </ToolView>
  );
}
