'use client';

import * as React from 'react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/controls';
import { Badge } from '@/components/ui/card';
import { baseTable, convertBase } from '@/lib/core/convert';
import { cn } from '@/lib/utils';

const BASES = [2, 8, 10, 16, 32, 36];

const BASE_LABEL: Record<number, string> = {
  2: '二进制 Binary',
  8: '八进制 Octal',
  10: '十进制 Decimal',
  16: '十六进制 Hex',
  32: '三十二进制',
  36: '三十六进制',
};

export default function NumberBase() {
  const tool = useToolMeta('number-base');
  useTrackRecent(tool.slug);

  const [from, setFrom] = React.useState(10);
  const [to, setTo] = React.useState(16);
  const [value, setValue] = React.useState('20261002');

  const result = React.useMemo(() => {
    if (!value.trim()) return { output: '', error: null as string | null };
    try {
      return { output: convertBase(value.trim(), from, to), error: null };
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : '转换失败' };
    }
  }, [value, from, to]);

  const table = React.useMemo(() => {
    if (!value.trim()) return [];
    try {
      return baseTable(value.trim(), from);
    } catch {
      return [];
    }
  }, [value, from]);

  const parsedDecimal = React.useMemo(() => {
    if (!value.trim()) return null;
    try {
      return convertBase(value.trim(), from, 10);
    } catch {
      return null;
    }
  }, [value, from]);

  return (
    <ToolView tool={tool}>
      <Panel title="进制转换" description="内部用 BigInt 计算，支持超大整数">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              输入（{from} 进制）
            </span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="输入数字…"
              className="font-mono text-[15px]"
              spellCheck={false}
              aria-invalid={Boolean(result.error)}
            />
            <Select
              value={String(from)}
              onValueChange={(v) => setFrom(Number(v))}
              options={BASES.map((b) => ({
                value: String(b),
                label: BASE_LABEL[b] ?? `${b} 进制`,
              }))}
              size="sm"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFrom(to);
              setTo(from);
              if (result.output) setValue(result.output);
            }}
            aria-label="交换进制"
            className="mx-auto grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:mb-1"
          >
            ⇄
          </button>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              输出（{to} 进制）
            </span>
            <div className="flex h-10 items-center rounded-lg border border-primary/30 bg-primary-subtle px-3">
              <span className="min-w-0 flex-1 truncate font-mono text-[15px] font-semibold text-primary">
                {result.output || '—'}
              </span>
              {result.output && <CopyIconButton value={result.output} sourceLabel="转换结果" />}
            </div>
            <Select
              value={String(to)}
              onValueChange={(v) => setTo(Number(v))}
              options={BASES.map((b) => ({
                value: String(b),
                label: BASE_LABEL[b] ?? `${b} 进制`,
              }))}
              size="sm"
            />
          </div>
        </div>

        {result.error && (
          <Notice tone="danger" className="mt-3">
            {result.error}
          </Notice>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {BASES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setTo(b)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                to === b
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
              )}
            >
              {b} 进制
            </button>
          ))}
        </div>
      </Panel>

      {table.length > 0 && (
        <>
          <Panel title="常用进制对照" description="同一个值在各进制下的表示">
            <div className="space-y-2">
              {table.map((row) => (
                <div
                  key={row.base}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2',
                    row.base === to
                      ? 'border-primary/40 bg-primary-subtle'
                      : 'border-border bg-background',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant={row.base === to ? 'default' : 'neutral'} size="sm">
                      {row.base}
                    </Badge>
                    <span className="truncate text-[11px] text-muted-foreground">{row.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <code className="max-w-[18rem] truncate font-mono text-[13px]">
                      {row.value}
                    </code>
                    <CopyIconButton value={row.value} sourceLabel={`${row.base} 进制值`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <CopyButton
                value={table.map((r) => `${r.base}: ${r.value}`).join('\n')}
                sourceLabel="对照表"
                size="xs"
              >
                复制对照表
              </CopyButton>
            </div>
          </Panel>

          <StatGrid
            columns={3}
            items={[
              { label: '十进制值', value: parsedDecimal ?? '—', tone: 'primary' },
              { label: '输入位数', value: value.trim().length },
              { label: '输出位数', value: result.output.length },
            ]}
          />

          <Notice tone="info">
            36 进制用 0-9 + a-z 表示，是这套进制里信息密度最高的写法，短链和紧凑 ID 常用。
            负数与超过 Number 安全范围的超大整数都走 BigInt，不会丢精度。
          </Notice>
        </>
      )}
    </ToolView>
  );
}
