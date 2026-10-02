'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { diffChars, diffLines, type Change } from 'diff';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Granularity = 'lines' | 'chars';

const LEFT = `iWhimsy 前端工具库
- 文本处理
- 编码加密
- 图片处理
- 颜色设计
所有计算都在浏览器本地完成。`;

const RIGHT = `iWhimsy 前端工具库
- 文本处理
- 编码加密
- 图片处理
- 颜色设计
- 数据格式
所有计算都在浏览器本地完成，没有服务端。`;

export default function TextDiff() {
  const tool = useToolMeta('text-diff');
  useTrackRecent(tool.slug);

  const [left, setLeft] = React.useState(LEFT);
  const [right, setRight] = React.useState(RIGHT);
  const [granularity, setGranularity] = React.useState<Granularity>('lines');
  const [ignoreWhitespace, setIgnoreWhitespace] = React.useState(false);

  const changes = React.useMemo<Change[]>(() => {
    const normalize = (s: string) => (ignoreWhitespace ? s.replace(/[ \t]+/g, ' ').trimEnd() : s);
    const a = normalize(left);
    const b = normalize(right);
    if (!a && !b) return [];
    return granularity === 'lines' ? diffLines(a, b) : diffChars(a, b);
  }, [left, right, granularity, ignoreWhitespace]);

  const counts = React.useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const c of changes) {
      const size = granularity === 'lines' ? (c.count ?? 0) : c.value.length;
      if (c.added) added += size;
      if (c.removed) removed += size;
    }
    return { added, removed };
  }, [changes, granularity]);

  const identical = counts.added === 0 && counts.removed === 0;

  const swap = () => {
    setLeft(right);
    setRight(left);
  };

  const outputText = React.useMemo(
    () =>
      changes
        .map((c) => {
          const mark = c.added ? '+' : c.removed ? '-' : ' ';
          if (granularity === 'lines') {
            return c.value
              .split('\n')
              .filter((l) => l !== '')
              .map((l) => `${mark} ${l}`)
              .join('\n');
          }
          return `${mark} ${c.value}`;
        })
        .join(''),
    [changes, granularity],
  );

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
          <ClearButton
            onClear={() => {
              setLeft('');
              setRight('');
            }}
          />
          <CopyButton value={outputText} sourceLabel="Diff 结果" variant="secondary">
            复制结果
          </CopyButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <SegmentedControl
          size="sm"
          value={granularity}
          onValueChange={setGranularity}
          options={[
            { value: 'lines', label: '按行对比' },
            { value: 'chars', label: '按字符对比' },
          ]}
        />
        <SwitchRow
          label="忽略空白差异"
          checked={ignoreWhitespace}
          onCheckedChange={setIgnoreWhitespace}
          className="gap-3"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="原始文本">
          <Textarea
            value={left}
            onChange={(e) => setLeft(e.target.value)}
            placeholder="粘贴原始文本…"
            className="min-h-52 font-mono text-[13px]"
            spellCheck={false}
          />
        </Panel>
        <Panel title="对比文本">
          <Textarea
            value={right}
            onChange={(e) => setRight(e.target.value)}
            placeholder="粘贴修改后的文本…"
            className="min-h-52 font-mono text-[13px]"
            spellCheck={false}
          />
        </Panel>
      </div>

      <Panel
        title="差异结果"
        description="绿色为新增，红色为删除"
        actions={
          <CopyButton value={outputText} sourceLabel="Diff 结果" size="xs">
            复制
          </CopyButton>
        }
      >
        {!left && !right ? (
          <EmptyState title="两侧都还没有内容" description="填入文本后即可看到差异" />
        ) : (
          <div className="space-y-3">
            <StatGrid
              columns={3}
              items={[
                {
                  label: '新增',
                  value: counts.added,
                  tone: 'success',
                  hint: granularity === 'lines' ? '行' : '字符',
                },
                {
                  label: '删除',
                  value: counts.removed,
                  tone: 'danger',
                  hint: granularity === 'lines' ? '行' : '字符',
                },
                {
                  label: '结论',
                  value: identical ? '完全一致' : '存在差异',
                  tone: identical ? 'success' : 'primary',
                },
              ]}
            />
            <div
              className={cn(
                'max-h-96 overflow-auto rounded-xl border border-border bg-background p-3',
                'font-mono text-[13px] leading-relaxed',
              )}
            >
              {changes.length === 0 ? (
                <span className="text-muted-foreground">无差异</span>
              ) : (
                changes.map((c, i) => (
                  <span
                    key={i}
                    className={cn(
                      'whitespace-pre-wrap break-all',
                      c.added && 'bg-success-subtle text-success',
                      c.removed && 'bg-danger-subtle text-danger line-through decoration-danger/50',
                    )}
                  >
                    {c.value}
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </Panel>
    </ToolView>
  );
}
