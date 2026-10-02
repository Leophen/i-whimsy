'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Field, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/controls';
import { convertUnit, UNIT_CATEGORIES } from '@/lib/core/convert';
import { trimNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function UnitConverter() {
  const tool = useToolMeta('unit-converter');
  useTrackRecent(tool.slug);

  const [categoryId, setCategoryId] = React.useState(UNIT_CATEGORIES[0]!.id);
  const [value, setValue] = React.useState('1');
  const [from, setFrom] = React.useState(UNIT_CATEGORIES[0]!.units[4]!.id);
  const [to, setTo] = React.useState(UNIT_CATEGORIES[0]!.units[5]!.id);

  const category = React.useMemo(
    () => UNIT_CATEGORIES.find((c) => c.id === categoryId) ?? UNIT_CATEGORIES[0]!,
    [categoryId],
  );

  // 切换分类时把两端重置到该类前两个单位，避免出现不存在的 id
  const switchCategory = (id: string) => {
    const next = UNIT_CATEGORIES.find((c) => c.id === id);
    if (!next) return;
    setCategoryId(id);
    setFrom(next.units[0]!.id);
    setTo(next.units[1]?.id ?? next.units[0]!.id);
  };

  const numeric = Number(value);
  const validInput = value.trim() !== '' && Number.isFinite(numeric);

  const result = React.useMemo(() => {
    if (!validInput) return null;
    try {
      return convertUnit(categoryId, from, to, numeric);
    } catch {
      return null;
    }
  }, [validInput, categoryId, from, to, numeric]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const allConversions = React.useMemo(() => {
    if (!validInput) return [];
    return category.units.map((u) => ({
      id: u.id,
      label: u.label,
      value: convertUnit(categoryId, from, u.id, numeric),
    }));
  }, [validInput, category, categoryId, from, numeric]);

  return (
    <ToolView tool={tool}>
      <Panel title="选择换算类型">
        <div className="flex flex-wrap gap-1.5">
          {UNIT_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => switchCategory(c.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                categoryId === c.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
              )}
            >
              {c.label}
              <span className="ml-1.5 text-subtle-foreground">{c.units.length}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`${category.label}换算`}>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Field label="从">
            <div className="space-y-2">
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="tabular font-mono text-[15px]"
                aria-invalid={!validInput}
              />
              <Select
                value={from}
                onValueChange={setFrom}
                options={category.units.map((u) => ({ value: u.id, label: u.label }))}
                size="sm"
              />
            </div>
          </Field>

          <button
            type="button"
            onClick={swap}
            aria-label="交换换算方向"
            className="mx-auto grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:mb-1"
          >
            <ArrowLeftRight className="size-4" />
          </button>

          <Field label="到">
            <div className="space-y-2">
              <div className="flex h-10 items-center rounded-lg border border-primary/30 bg-primary-subtle px-3">
                <span className="tabular min-w-0 flex-1 truncate font-mono text-[15px] font-semibold text-primary">
                  {result === null ? '—' : trimNumber(result)}
                </span>
                {result !== null && (
                  <CopyIconButton value={String(trimNumber(result))} sourceLabel="换算结果" />
                )}
              </div>
              <Select
                value={to}
                onValueChange={setTo}
                options={category.units.map((u) => ({ value: u.id, label: u.label }))}
                size="sm"
              />
            </div>
          </Field>
        </div>

        {result !== null && (
          <div className="mt-4 rounded-xl border border-border bg-background px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <code className="font-mono text-[13px]">
                {trimNumber(numeric)} {category.units.find((u) => u.id === from)?.label} ={' '}
                <span className="font-semibold text-primary">{trimNumber(result)}</span>{' '}
                {category.units.find((u) => u.id === to)?.label}
              </code>
              <CopyButton
                value={`${trimNumber(numeric)} ${category.units.find((u) => u.id === from)?.label} = ${trimNumber(result)} ${category.units.find((u) => u.id === to)?.label}`}
                sourceLabel="换算式"
                size="xs"
              >
                复制
              </CopyButton>
            </div>
          </div>
        )}
      </Panel>

      {allConversions.length > 0 && (
        <Panel
          title={`${category.label}全表`}
          description={`${trimNumber(numeric)} ${category.units.find((u) => u.id === from)?.label} 换算到所有单位`}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {allConversions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigator.clipboard?.writeText(String(trimNumber(c.value)))}
                title={`复制 ${trimNumber(c.value)}`}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition-colors',
                  c.id === to
                    ? 'border-primary/40 bg-primary-subtle'
                    : 'border-border bg-background hover:border-primary/30',
                )}
              >
                <div className="text-[11px] text-muted-foreground">{c.label}</div>
                <div className="tabular mt-0.5 truncate font-mono text-[13px] font-medium">
                  {trimNumber(c.value)}
                </div>
              </button>
            ))}
          </div>
        </Panel>
      )}

      <StatGrid
        columns={3}
        items={[
          { label: '换算类别', value: UNIT_CATEGORIES.length, hint: '大类' },
          { label: '当前类单位数', value: category.units.length, tone: 'primary' },
          { label: '基准单位', value: category.base },
        ]}
      />

      <Notice tone="info">
        所有换算都先归一到该类的基准单位再转出，避免为每对单位维护一张表。
        温度走的是专门的换算函数（摄氏 ↔ 华氏 ↔ 开尔文），不是简单乘除。
      </Notice>
    </ToolView>
  );
}
