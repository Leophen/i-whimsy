'use client';

import * as React from 'react';
import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Input } from '@/components/ui/input';
import { fromRoman, toRoman } from '@/lib/core/convert';

const TABLE: [number, string][] = [
  [1, 'I'],
  [4, 'IV'],
  [5, 'V'],
  [9, 'IX'],
  [10, 'X'],
  [40, 'XL'],
  [50, 'L'],
  [90, 'XC'],
  [100, 'C'],
  [400, 'CD'],
  [500, 'D'],
  [900, 'CM'],
  [1000, 'M'],
];

export default function RomanNumeral() {
  const tool = useToolMeta('roman-numeral');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'toRoman' | 'fromRoman'>('toRoman');
  const [input, setInput] = React.useState('2026');

  const result = React.useMemo(() => {
    const raw = input.trim();
    if (!raw) return { output: '', error: null as string | null };
    try {
      if (mode === 'toRoman') {
        const n = Number(raw);
        if (!Number.isInteger(n)) return { output: '', error: '请输入整数' };
        if (n < 1 || n > 3999) return { output: '', error: '罗马数字只支持 1 ~ 3999' };
        return { output: toRoman(n), error: null };
      }
      if (!/^[IVXLCDMivxlcdm]+$/.test(raw)) {
        return { output: '', error: '只能包含 I V X L C D M 这几个字母' };
      }
      return { output: String(fromRoman(raw.toUpperCase())), error: null };
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : '转换失败' };
    }
  }, [input, mode]);

  const quickYears = [1999, 2000, 2024, 2025, 2026, 2027];

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <SegmentedControl
            size="sm"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'toRoman', label: '数字 → 罗马' },
              { value: 'fromRoman', label: '罗马 → 数字' },
            ]}
          />
          <ClearButton onClear={() => setInput('')} />
        </>
      }
    >
      <ToolIO
        input={
          <Panel title={mode === 'toRoman' ? '阿拉伯数字' : '罗马数字'}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'toRoman' ? '输入 1 ~ 3999' : '例如 MMXXVI'}
              className="font-mono text-[15px] uppercase"
              spellCheck={false}
              aria-invalid={Boolean(result.error)}
            />
            {result.error && <p className="mt-2 text-xs text-danger">{result.error}</p>}

            {mode === 'toRoman' && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {quickYears.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setInput(String(y))}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {y}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setInput(String(new Date().getFullYear()))}
                  className="rounded-md border border-primary/40 bg-primary-subtle px-2 py-0.5 text-[11px] text-primary"
                >
                  今年
                </button>
              </div>
            )}
          </Panel>
        }
        output={
          <Panel
            title={mode === 'toRoman' ? '罗马数字' : '阿拉伯数字'}
            actions={
              <CopyButton value={result.output} sourceLabel="转换结果" size="xs">
                复制
              </CopyButton>
            }
          >
            <div className="flex min-h-24 items-center justify-center rounded-xl border border-primary/25 bg-primary-subtle p-5">
              {result.output ? (
                <span className="font-mono text-3xl font-semibold tracking-wider text-primary">
                  {result.output}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {result.error ? '无法转换' : '等待输入'}
                </span>
              )}
            </div>

            <div className="mt-3">
              <StatGrid
                columns={2}
                items={[
                  { label: '输入长度', value: input.trim().length },
                  { label: '输出长度', value: result.output.length, tone: 'primary' },
                ]}
              />
            </div>
          </Panel>
        }
      />

      <Panel title="基本符号对照" description="点击复制">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {TABLE.map(([num, sym]) => (
            <button
              key={sym}
              type="button"
              onClick={() => navigator.clipboard?.writeText(sym)}
              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-2.5 py-2 transition-colors hover:border-primary/40"
            >
              <span className="font-mono text-[13px] font-semibold text-primary">{sym}</span>
              <span className="tabular text-[12px] text-muted-foreground">{num}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Notice tone="info">
        <div className="space-y-1">
          <div>
            规则：相同符号连写表示相加（III = 3）；小的在大的右边相加（VI = 6）、左边相减（IV =
            4）。
          </div>
          <div>
            同一符号最多连写三次，且只有 I、X、C 能作减法前缀（IL 表示 49 是不规范的，应为 XLIX）。
          </div>
          <div>
            传统罗马数字没有 0，也没有表示 4000 以上数字的标准写法 —— 所以上限是 3999（MMMCMXCIX）。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
