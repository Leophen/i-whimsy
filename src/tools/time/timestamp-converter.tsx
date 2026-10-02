'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import {
  TIMESTAMP_UNITS,
  dateToTimestamp,
  formatDateTime,
  guessTimestampUnit,
  nowTimestamp,
  timestampToDate,
  type TimestampUnit,
} from '@/lib/core/datetime';
import { cn } from '@/lib/utils';

function relativeTime(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const units: [number, string][] = [
    [31536000000, '年'],
    [2592000000, '个月'],
    [604800000, '周'],
    [86400000, '天'],
    [3600000, '小时'],
    [60000, '分钟'],
    [1000, '秒'],
  ];
  for (const [ms, label] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      return diffMs >= 0 ? `${n} ${label}后` : `${n} ${label}前`;
    }
  }
  return '刚刚';
}

export default function TimestampConverter() {
  const tool = useToolMeta('timestamp-converter');
  useTrackRecent(tool.slug);

  const [unit, setUnit] = React.useState<TimestampUnit>('s');
  const [raw, setRaw] = React.useState(() => String(nowTimestamp('s')));
  const [dateStr, setDateStr] = React.useState('');
  const [now, setNow] = React.useState(() => nowTimestamp('s'));

  React.useEffect(() => {
    const t = setInterval(() => setNow(nowTimestamp('s')), 1000);
    return () => clearInterval(t);
  }, []);

  const current: TimestampUnit = React.useMemo(
    () => (raw.trim() ? guessTimestampUnit(raw) : unit),
    [raw, unit],
  );

  const parsed = React.useMemo(() => {
    if (!raw.trim() || !/^-?\d+$/.test(raw.trim())) return null;
    return timestampToDate(Number(raw.trim()), current);
  }, [raw, current]);

  const rows = React.useMemo(() => {
    if (!parsed) return [];
    return [
      { label: '秒级时间戳', value: String(dateToTimestamp(parsed, 's')) },
      { label: '毫秒级时间戳', value: String(dateToTimestamp(parsed, 'ms')) },
      { label: 'ISO 8601', value: parsed.toISOString() },
      { label: 'UTC', value: parsed.toUTCString() },
      { label: '本地时间', value: formatDateTime(parsed) },
      { label: '相对现在', value: relativeTime(parsed) },
    ];
  }, [parsed]);

  // 日期 → 时间戳（反向）
  const reverseResult = React.useMemo(() => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return {
      seconds: dateToTimestamp(d, 's'),
      milliseconds: dateToTimestamp(d, 'ms'),
      iso: d.toISOString(),
    };
  }, [dateStr]);

  const applyNow = () => {
    setRaw(String(nowTimestamp(unit)));
    setUnit(unit);
  };

  const applyFromDate = () => {
    if (!reverseResult) return;
    setRaw(String(unit === 'ms' ? reverseResult.milliseconds : reverseResult.seconds));
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <button
          type="button"
          onClick={applyNow}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          <RefreshCw className="size-3.5" />
          用当前时间
        </button>
      }
    >
      <Panel title="时间戳 → 日期" description="自动识别秒级 / 毫秒级">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="例如 1759344000 或 1759344000000"
            className="flex-1 font-mono text-[13px]"
            spellCheck={false}
            aria-invalid={Boolean(raw.trim()) && parsed === null}
          />
          <SegmentedControl
            size="sm"
            value={unit}
            onValueChange={(v) => {
              setUnit(v);
              if (parsed) setRaw(String(dateToTimestamp(parsed, v)));
            }}
            options={TIMESTAMP_UNITS.map((u) => ({ value: u.key, label: u.label }))}
          />
        </div>

        {raw.trim() && !parsed && <p className="mt-2 text-xs text-danger">请输入纯数字时间戳</p>}

        {raw.trim() && parsed && (
          <Badge variant="neutral" size="md" className="mt-2">
            已按{current === 's' ? '秒级' : '毫秒级'}解析
          </Badge>
        )}

        <div className="mt-4">
          <StatGrid
            columns={2}
            items={[
              { label: '当前秒级时间戳', value: now, tone: 'primary' },
              { label: '当前毫秒级', value: `${now}000` },
            ]}
          />
        </div>
      </Panel>

      <ToolIO
        input={
          <Panel title="日期 → 时间戳" description="反向换算">
            <Field label="选择日期时间" hint="按你所在时区的本地时间解读">
              <Input
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="font-mono text-[13px]"
              />
            </Field>

            {reverseResult && (
              <div className="mt-3 space-y-2">
                {[
                  { label: '秒级', value: String(reverseResult.seconds) },
                  { label: '毫秒级', value: String(reverseResult.milliseconds) },
                  { label: 'ISO 8601', value: reverseResult.iso },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                      {r.label}
                    </span>
                    <code className="min-w-0 flex-1 truncate text-right font-mono text-[13px]">
                      {r.value}
                    </code>
                    <CopyIconButton value={r.value} sourceLabel={r.label} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={applyFromDate}
                  className="h-9 w-full rounded-lg border border-primary/40 bg-primary-subtle px-3 text-[13px] font-medium text-primary transition-colors hover:bg-primary-subtle/70"
                >
                  填到上方输入框
                </button>
              </div>
            )}
          </Panel>
        }
        output={
          <Panel
            title="换算结果"
            actions={
              <CopyButton
                value={rows.map((r) => `${r.label}: ${r.value}`).join('\n')}
                sourceLabel="全部结果"
                size="xs"
              >
                复制全部
              </CopyButton>
            }
          >
            {!parsed ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                输入时间戳后这里会给出各种格式
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2',
                      r.label === '相对现在' && 'border-primary/30 bg-primary-subtle/40',
                    )}
                  >
                    <span className="w-24 shrink-0 text-[11px] font-medium text-muted-foreground">
                      {r.label}
                    </span>
                    <code className="min-w-0 flex-1 truncate text-right font-mono text-[13px] text-foreground">
                      {r.value}
                    </code>
                    <CopyIconButton value={String(r.value)} sourceLabel={r.label} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        10 位通常是秒、13 位是毫秒 —— 这里按位数自动判断，也支持手动切换。 接口里常见的{' '}
        <code className="font-mono">createTime</code> 字段大多是毫秒级。
      </Notice>
    </ToolView>
  );
}
