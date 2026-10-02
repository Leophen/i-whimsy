'use client';

import * as React from 'react';
import { Braces } from 'lucide-react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { queryJsonPath } from '@/lib/core/dev';
import { cn } from '@/lib/utils';

const SAMPLE_JSON = `{
  "store": {
    "name": "iWhimsy",
    "books": [
      { "title": "CSS 权威指南", "price": 88, "stock": 12 },
      { "title": "高性能网站建设", "price": 56, "stock": 0 },
      { "title": "React 设计原理", "price": 72, "stock": 5 }
    ],
    "tags": ["frontend", "tools", "css"]
  },
  "version": 3
}`;

const EXAMPLES = [
  { expr: '$.store.name', note: '取单个字段' },
  { expr: '$.store.books[*].title', note: '取数组里所有 title' },
  { expr: '$.store.books[0]', note: '取第一项' },
  { expr: '$.store.books[0:2]', note: '切片，前两项' },
  { expr: '$..title', note: '递归搜索所有 title' },
  { expr: '$.store.books[?(@.stock > 0)]', note: '过滤：有库存的' },
  { expr: '$.store.books[?(@.price >= 72)].title', note: '过滤后再取字段' },
];

const CHEATSHEET: [string, string][] = [
  ['$', '根节点'],
  ["$.key / $['key']", '取对象属性'],
  ['$[0] / $[-1]', '数组下标（不支持负索引）'],
  ['$[0:3]', '切片，含头不含尾'],
  ['$[*]', '数组全部元素 / 对象全部值'],
  ['$..key', '递归向下搜索该键'],
  ['$[?(@.a > 1)]', '过滤器，支持 = != > >= < <='],
];

export default function JsonPathTool() {
  const tool = useToolMeta('json-path');
  useTrackRecent(tool.slug);

  const [json, setJson] = React.useState(SAMPLE_JSON);
  const [expr, setExpr] = React.useState('$.store.books[?(@.stock > 0)].title');

  const { parsed, parseError } = React.useMemo(() => {
    if (!json.trim()) return { parsed: undefined, parseError: null as string | null };
    try {
      return { parsed: JSON.parse(json) as unknown, parseError: null as string | null };
    } catch (err) {
      return {
        parsed: undefined,
        parseError: err instanceof Error ? err.message : 'JSON 解析失败',
      };
    }
  }, [json]);

  const { matches, error } = React.useMemo(() => {
    if (parsed === undefined) return { matches: [], error: null as string | null };
    return queryJsonPath(parsed, expr);
  }, [parsed, expr]);

  const resultText = React.useMemo(() => {
    if (matches.length === 0) return '';
    if (matches.length === 1) return JSON.stringify(matches[0]!.value, null, 2);
    return JSON.stringify(
      matches.map((m) => m.value),
      null,
      2,
    );
  }, [matches]);

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={resultText} sourceLabel="查询结果" variant="secondary">
          复制结果
        </CopyButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel
          title="JSON 数据"
          actions={
            <button
              type="button"
              onClick={() => setJson(SAMPLE_JSON)}
              className="inline-flex h-7 items-center rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              示例
            </button>
          }
          bodyClassName="p-0"
        >
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder="粘贴 JSON"
            spellCheck={false}
            aria-invalid={Boolean(parseError)}
            className="min-h-72 rounded-none border-0 font-mono text-[12px] leading-relaxed focus:ring-0"
          />
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="JSONPath 表达式"
            actions={
              <CopyButton value={expr} sourceLabel="表达式" size="xs">
                复制
              </CopyButton>
            }
            bodyClassName="p-0"
          >
            <input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="$.store.books[0].title"
              spellCheck={false}
              aria-label="JSONPath 表达式"
              className="h-12 w-full bg-transparent px-4 font-mono text-[13px] focus:outline-none"
            />
          </Panel>

          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.expr}
                type="button"
                onClick={() => setExpr(ex.expr)}
                title={ex.note}
                className={cn(
                  'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors',
                  expr === ex.expr
                    ? 'border-primary/50 bg-primary-subtle text-primary'
                    : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary',
                )}
              >
                {ex.expr}
              </button>
            ))}
          </div>

          <Panel
            title="匹配结果"
            description={`${matches.length} 条`}
            actions={
              <CopyButton value={resultText} sourceLabel="结果" size="xs" disabled={!resultText}>
                复制
              </CopyButton>
            }
          >
            {parseError ? (
              <p className="rounded-lg border border-danger/25 bg-danger-subtle px-3 py-2 text-xs text-danger">
                JSON 解析失败：{parseError}
              </p>
            ) : error ? (
              <p className="rounded-lg border border-warning/25 bg-warning-subtle px-3 py-2 text-xs text-warning">
                {error}
              </p>
            ) : matches.length === 0 ? (
              <EmptyState
                icon={<Braces />}
                title={expr.trim() ? '没有匹配到任何节点' : '输入表达式开始查询'}
                description="检查路径是否存在，或改用 $..key 递归搜索"
              />
            ) : (
              <>
                <pre className="scrollbar-none max-h-64 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[12px] leading-relaxed">
                  {resultText}
                </pre>
                {matches.length > 1 && (
                  <div className="mt-3 space-y-1.5">
                    {matches.slice(0, 12).map((m, i) => (
                      <div
                        key={`${m.path}-${i}`}
                        className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-background px-3 py-1.5"
                      >
                        <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-subtle-foreground">
                          {m.path}
                        </code>
                        <code className="max-w-[55%] truncate font-mono text-[11px]">
                          {JSON.stringify(m.value)}
                        </code>
                      </div>
                    ))}
                    {matches.length > 12 && (
                      <p className="text-center text-[11px] text-muted-foreground">
                        仅显示前 12 条路径，共 {matches.length} 条
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="语法速查" description="本工具实现的是 JSONPath 的实用子集">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {CHEATSHEET.map(([syntax, note]) => (
            <div
              key={syntax}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
            >
              <code className="font-mono text-[12px] text-primary">{syntax}</code>
              <span className="text-[11px] text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Notice tone="info">
        暂不支持脚本函数、正则匹配与多条件 && ||；过滤器目前只解析第一个条件表达式。
        复杂查询可以先用 <code className="font-mono">$..key</code> 缩小范围再逐层取。
      </Notice>

      <StatGrid
        columns={3}
        items={[
          { label: '匹配数量', value: matches.length, tone: 'primary' },
          { label: '表达式长度', value: expr.length },
          { label: 'JSON 节点', value: json.trim() ? countNodes(parsed) : 0 },
        ]}
      />
    </ToolView>
  );
}

function countNodes(node: unknown): number {
  if (node === null || typeof node !== 'object') return 1;
  if (Array.isArray(node)) return 1 + node.reduce((sum, n) => sum + countNodes(n), 0);
  return 1 + Object.values(node).reduce((sum, n) => sum + countNodes(n), 0);
}
