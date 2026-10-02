'use client';

import * as React from 'react';
import { CalendarClock } from 'lucide-react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { parseCron } from '@/lib/core/convert';
import { formatDateTime } from '@/lib/core/datetime';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每小时整点', value: '0 * * * *' },
  { label: '每天 0 点', value: '0 0 * * *' },
  { label: '每天 9:30', value: '30 9 * * *' },
  { label: '每周一 9 点', value: '0 9 * * 1' },
  { label: '每月 1 号', value: '0 0 1 * *' },
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '工作日 18 点', value: '0 18 * * 1-5' },
  { label: '每季度首日', value: '0 0 1 1,4,7,10 *' },
  { label: '每年 1 月 1 日', value: '0 0 1 1 *' },
];

const FIELD_HELP = [
  { key: 'minute', label: '分钟', range: '0–59', sample: '*/5、0,30' },
  { key: 'hour', label: '小时', range: '0–23', sample: '9、9-18' },
  { key: 'dayOfMonth', label: '日', range: '1–31', sample: '1、*/2' },
  { key: 'month', label: '月', range: '1–12 或 JAN–DEC', sample: '*/3、1,7' },
  { key: 'dayOfWeek', label: '星期', range: '0–7 或 SUN–SAT', sample: '1-5、MON' },
];

export default function CronParser() {
  const tool = useToolMeta('cron-parser');
  useTrackRecent(tool.slug);

  const [expression, setExpression] = React.useState('0 9 * * 1-5');
  const [count, setCount] = React.useState(5);

  const result = React.useMemo(() => parseCron(expression, count), [expression, count]);

  const hasInput = expression.trim().length > 0;

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={expression} sourceLabel="Cron 表达式" variant="secondary">
          复制表达式
        </CopyButton>
      }
    >
      <Panel title="Cron 表达式" description="标准 5 段写法：分 时 日 月 星期">
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="0 9 * * 1-5"
          className="font-mono text-[15px]"
          spellCheck={false}
          aria-invalid={Boolean(result.error)}
        />
        {result.error && <p className="mt-2 text-xs text-danger">{result.error}</p>}

        <div className="mt-3">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            常用预设
          </span>
          <div className="mt-4 border-t border-border pt-3.5">
            <SliderRow
              label="预览执行次数"
              value={count}
              onChange={setCount}
              min={1}
              max={10}
              suffix=" 次"
              className="max-w-xs"
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setExpression(p.value)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                  expression === p.value
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {p.label}
                <code className="ml-1.5 font-mono text-[10px] text-subtle-foreground">
                  {p.value}
                </code>
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {!hasInput || result.error ? (
        <EmptyState
          icon={<CalendarClock />}
          title={result.error ? '表达式无法解析' : '等待输入'}
          description={result.error ? '检查字段数量与取值范围' : '填入 Cron 表达式后查看执行计划'}
        />
      ) : (
        <>
          <Panel title="自然语言解释">
            <div className="rounded-xl border border-primary/25 bg-primary-subtle px-4 py-3.5">
              <p className="text-[15px] font-medium leading-relaxed text-primary">
                {result.humanized}
              </p>
              {result.command && (
                <p className="mt-2 font-mono text-[12px] text-muted-foreground">
                  执行命令：{result.command}
                </p>
              )}
            </div>
          </Panel>

          <Panel title="字段拆解" description="每个字段分别命中了哪些值">
            <div className="space-y-2">
              {result.fields.map((f, i) => (
                <div key={f.key} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" size="sm">
                        {FIELD_HELP[i]?.label ?? f.label}
                      </Badge>
                      <code className="font-mono text-[13px] text-primary">{f.raw}</code>
                      <span className="text-[11px] text-muted-foreground">
                        {FIELD_HELP[i]?.range}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      命中 {f.values.length} 个值
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.values.slice(0, 32).map((v) => (
                      <span
                        key={v}
                        className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]"
                      >
                        {v}
                      </span>
                    ))}
                    {f.values.length > 32 && (
                      <span className="px-1 py-0.5 text-[11px] text-muted-foreground">
                        …等 {f.values.length} 个
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title={`接下来 ${result.nextRuns.length} 次执行时间`}
            description="按你所在时区的本地时间显示"
            actions={
              <CopyButton
                value={result.nextRuns.map((d) => formatDateTime(d)).join('\n')}
                sourceLabel="执行时间列表"
                size="xs"
              >
                复制
              </CopyButton>
            }
          >
            <div className="space-y-2">
              {result.nextRuns.map((d, i) => (
                <div
                  key={d.toISOString()}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5',
                    i === 0 ? 'border-primary/40 bg-primary-subtle' : 'border-border bg-background',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Badge variant={i === 0 ? 'default' : 'neutral'} size="sm">
                      #{i + 1}
                    </Badge>
                    <span className="tabular font-mono text-[13px]">{formatDateTime(d)}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{relativeFromNow(d)}</span>
                    <CopyIconButton value={formatDateTime(d)} sourceLabel="执行时间" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <StatGrid
            columns={3}
            items={[
              { label: '字段数', value: result.fields.length },
              {
                label: '下次执行',
                value: relativeFromNow(result.nextRuns[0] ?? new Date()),
                tone: 'primary',
              },
              {
                label: '执行频率',
                value: result.nextRuns.length > 1 ? estimateFrequency(result.nextRuns) : '—',
              },
            ]}
          />
        </>
      )}

      <Notice tone="warning">
        <div className="space-y-1">
          <div>
            星期字段里 0 和 7 都表示周日。当「日」和「星期」都限制了具体值（不是{' '}
            <code className="font-mono">*</code>）时，多数 Cron 实现取<strong>并集</strong>而非交集
            —— 这点各平台行为不一致，上线前务必实测。
          </div>
          <div>
            这里按本地时区计算。服务器 Cron、K8s
            CronJob、云函数定时触发器的时区配置各不相同，注意对齐。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}

function relativeFromNow(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return '已过期';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟后`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时后`;
  return `${Math.floor(hours / 24)} 天后`;
}

function estimateFrequency(runs: Date[]): string {
  if (runs.length < 2) return '—';
  const delta = runs[1]!.getTime() - runs[0]!.getTime();
  const mins = Math.round(delta / 60000);
  if (mins < 60) return `每 ${mins} 分钟`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `每 ${hours} 小时`;
  return `每 ${Math.round(hours / 24)} 天`;
}
