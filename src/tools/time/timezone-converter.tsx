'use client';

import * as React from 'react';
import { Globe } from 'lucide-react';

import { CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Field, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/controls';
import { Badge } from '@/components/ui/card';
import {
  COMMON_TIME_ZONES,
  formatInTimeZone,
  guessLocalTimeZone,
  timeZoneOffset,
} from '@/lib/core/datetime';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/lib/hooks';

const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 判断某时刻在当地是否属于工作时间（周一至周五 9:00–18:00） */
function isWorkingHour(date: Date, timeZone: string): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short',
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    return !isWeekend && hour >= 9 && hour < 18;
  } catch {
    return false;
  }
}

export default function TimezoneConverter() {
  const tool = useToolMeta('timezone-converter');
  useTrackRecent(tool.slug);

  const [sourceTz, setSourceTz] = React.useState('Asia/Shanghai');
  const [dateStr, setDateStr] = React.useState(() => toLocalInput(new Date()));

  // 本机时区只有浏览器知道，未 hydration 前用 Asia/Shanghai 兜底，避免 SSR 不一致
  const localTz = useHydrated() ? guessLocalTimeZone() : 'Asia/Shanghai';

  const parsed = React.useMemo(() => {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [dateStr]);

  const zoneOptions = React.useMemo(() => {
    const ids = new Set(COMMON_TIME_ZONES.map((z) => z.id));
    if (!ids.has(localTz)) {
      return [{ id: localTz, label: `本机时区 · ${localTz}` }, ...COMMON_TIME_ZONES];
    }
    return COMMON_TIME_ZONES.map((z) =>
      z.id === localTz ? { ...z, label: `${z.label}（本机）` } : z,
    );
  }, [localTz]);

  return (
    <ToolView tool={tool}>
      <Panel title="选择时刻" description="指定这个时刻属于哪个时区，下面列出全球对照">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="日期时间">
            <Input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="font-mono text-[13px]"
            />
          </Field>
          <Field label="该时间所属时区" hint="默认本机时区">
            <Select
              value={sourceTz}
              onValueChange={setSourceTz}
              options={zoneOptions.map((z) => ({ value: z.id, label: z.label }))}
              size="sm"
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setDateStr(toLocalInput(new Date()))}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            此刻
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setUTCHours(0, 0, 0, 0);
              d.setDate(d.getDate() + 1);
              setDateStr(toLocalInput(d));
            }}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            明天 00:00
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              d.setMinutes(0, 0, 0);
              d.setHours(d.getHours() + 1);
              setDateStr(toLocalInput(d));
            }}
            className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            下一整点
          </button>
        </div>
      </Panel>

      {parsed ? (
        <>
          <StatGrid
            columns={3}
            items={[
              { label: '源时区', value: sourceTz.split('/').pop() ?? sourceTz },
              { label: 'UTC 偏移', value: timeZoneOffset(parsed, sourceTz), tone: 'primary' },
              {
                label: '本机时区',
                value: localTz.split('/').pop() ?? localTz,
              },
            ]}
          />

          <Panel
            title="全球时区对照"
            description="同一时刻在各时区的当地时间，绿色标记为当地工作时间（周一至周五 9:00–18:00）"
          >
            <div className="space-y-2">
              {COMMON_TIME_ZONES.map((z) => {
                const working = isWorkingHour(parsed, z.id);
                return (
                  <div
                    key={z.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                      working
                        ? 'border-success/30 bg-success-subtle/40'
                        : 'border-border bg-background',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Globe
                        className={cn(
                          'size-3.5 shrink-0',
                          working ? 'text-success' : 'text-muted-foreground',
                        )}
                      />
                      <span className="truncate text-[13px] font-medium">{z.label}</span>
                      {z.id === sourceTz && (
                        <Badge variant="default" size="sm">
                          源
                        </Badge>
                      )}
                      {z.id === localTz && (
                        <Badge variant="neutral" size="sm">
                          本机
                        </Badge>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular font-mono text-[13px]">
                        {formatInTimeZone(parsed, z.id, false)}
                      </span>
                      <span className="tabular w-14 text-right font-mono text-[11px] text-muted-foreground">
                        {timeZoneOffset(parsed, z.id)}
                      </span>
                      <CopyIconButton
                        value={formatInTimeZone(parsed, z.id)}
                        sourceLabel={`${z.label} 时间`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Notice tone="info">
            时间换算基于浏览器内置的 IANA 时区数据库（Intl API），会自动处理夏令时切换 ——
            夏令时生效期间各时区的 UTC 偏移会随之变化，这里显示的偏移是按当前这个时刻实际计算的。
          </Notice>
        </>
      ) : (
        <Notice tone="danger">请输入有效的日期时间</Notice>
      )}
    </ToolView>
  );
}
