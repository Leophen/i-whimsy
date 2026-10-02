'use client';

import * as React from 'react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Field, Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import {
  OCTAL_TABLE,
  permissionsToNumeric,
  permissionsToSymbolic,
  type ChmodState,
  type Permission,
} from '@/lib/core/convert';
import { cn } from '@/lib/utils';

const GROUPS: { key: keyof ChmodState; label: string; hint: string }[] = [
  { key: 'owner', label: '所有者 User', hint: 'u' },
  { key: 'group', label: '用户组 Group', hint: 'g' },
  { key: 'other', label: '其他 Others', hint: 'o' },
];

const PERMS: { key: keyof Permission; label: string; bit: number }[] = [
  { key: 'read', label: '读取 r', bit: 4 },
  { key: 'write', label: '写入 w', bit: 2 },
  { key: 'execute', label: '执行 x', bit: 1 },
];

const PRESETS: { label: string; value: string; note: string }[] = [
  { label: '755', value: '755', note: '可执行文件、目录的常用权限' },
  { label: '644', value: '644', note: '普通文件默认权限' },
  { label: '600', value: '600', note: '私钥等敏感文件' },
  { label: '700', value: '700', note: '仅自己可用的目录' },
  { label: '777', value: '777', note: '全部放开（不推荐）' },
  { label: '664', value: '664', note: '组内可写的共享文件' },
];

function symbolicFor(p: Permission): string {
  return `${p.read ? 'r' : '-'}${p.write ? 'w' : '-'}${p.execute ? 'x' : '-'}`;
}

function fromNumeric(input: string): ChmodState | null {
  const cleaned = input.trim();
  if (!/^[0-7]{3}$/.test(cleaned)) return null;
  const digits = cleaned.split('').map(Number) as [number, number, number];
  const toPerm = (d: number): Permission => ({
    read: (d & 4) !== 0,
    write: (d & 2) !== 0,
    execute: (d & 1) !== 0,
  });
  return {
    owner: toPerm(digits[0]),
    group: toPerm(digits[1]),
    other: toPerm(digits[2]),
  };
}

export default function ChmodCalculator() {
  const tool = useToolMeta('chmod-calculator');
  useTrackRecent(tool.slug);

  const [state, setState] = React.useState<ChmodState>(() => fromNumeric('755')!);
  const [numericInput, setNumericInput] = React.useState('755');
  const [error, setError] = React.useState<string | null>(null);

  const numeric = permissionsToNumeric(state);
  const symbolic = permissionsToSymbolic(state);

  const toggle = (group: keyof ChmodState, perm: keyof Permission) => {
    setState((prev) => ({ ...prev, [group]: { ...prev[group], [perm]: !prev[group][perm] } }));
  };

  const applyNumeric = (raw: string) => {
    setNumericInput(raw);
    const parsed = fromNumeric(raw);
    if (parsed) {
      setState(parsed);
      setError(null);
    } else {
      setError(raw.length === 3 ? '请输入三位 0-7 的数字' : '需要正好三位数字，例如 755');
    }
  };

  return (
    <ToolView tool={tool}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <Panel title="权限勾选" description="点选每组的读、写、执行权限">
          <div className="space-y-3">
            {GROUPS.map((g) => (
              <div key={g.key} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {g.hint}
                    </Badge>
                    <span className="text-[13px] font-medium">{g.label}</span>
                  </div>
                  <span className="tabular font-mono text-[13px] text-muted-foreground">
                    {symbolicFor(state[g.key])}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {PERMS.map((p) => {
                    const on = state[g.key][p.key];
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => toggle(g.key, p.key)}
                        aria-pressed={on}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          on
                            ? 'border-primary bg-primary-subtle text-primary'
                            : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'grid size-3.5 place-items-center rounded-[4px] border text-[9px]',
                            on
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border-strong',
                          )}
                        >
                          {on ? '✓' : ''}
                        </span>
                        {p.label}
                        <span className="text-subtle-foreground">{p.bit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="数字表示">
            <Field label="八进制权限" error={error ?? undefined}>
              <div className="flex items-center gap-2">
                <Input
                  value={numericInput}
                  onChange={(e) => applyNumeric(e.target.value)}
                  maxLength={3}
                  className="tabular font-mono text-[15px]"
                  aria-invalid={Boolean(error)}
                />
                <CopyIconButton value={numeric} sourceLabel="数字权限" />
              </div>
            </Field>

            <div className="mt-4 rounded-xl border border-primary/25 bg-primary-subtle p-4 text-center">
              <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                chmod 命令
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <code className="font-mono text-[13px] font-semibold text-primary">
                  chmod {numeric} filename
                </code>
                <CopyButton
                  value={`chmod ${numeric} filename`}
                  sourceLabel="chmod 命令"
                  size="xs"
                  variant="ghost"
                >
                  复制
                </CopyButton>
              </div>
            </div>

            <div className="mt-3">
              <StatGrid
                columns={2}
                items={[
                  { label: '数字形式', value: numeric, tone: 'primary' },
                  { label: '符号形式', value: symbolic },
                ]}
              />
            </div>
          </Panel>

          <Panel title="常用预设">
            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => applyNumeric(p.value)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors',
                    numeric === p.value
                      ? 'border-primary/40 bg-primary-subtle'
                      : 'border-border bg-background hover:border-primary/30',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <code className="font-mono text-[13px] font-semibold">{p.label}</code>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {permissionsToSymbolic(fromNumeric(p.value)!)}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">{p.note}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="八进制对照表" description="每个数字位对应的 rwx 组合">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {OCTAL_TABLE.map((o) => (
            <div
              key={o.digit}
              className="rounded-xl border border-border bg-background px-2.5 py-2 text-center"
            >
              <div className="tabular text-base font-semibold">{o.digit}</div>
              <div className="mt-0.5 font-mono text-[11px] text-primary">{o.rwx}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{o.text}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Notice tone="warning">
        <div className="space-y-1">
          <div>
            <code className="font-mono">777</code> 意味着任何人都能改能执行，生产环境基本不该出现。
            私钥、配置文件这类通常是 <code className="font-mono">600</code> 或{' '}
            <code className="font-mono">400</code>。
          </div>
          <div>
            目录需要有<strong>执行</strong>权限才能进入（cd），这点常被忽略 —— 目录没 x
            权限时，即使有 r 也列不出内容。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
