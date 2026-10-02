'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { escapeHtml, unescapeHtml } from '@/lib/core/encoding';
import { cn } from '@/lib/utils';

const SAMPLE = `<div class="card">
  <h1>标题 & 内容</h1>
  <p>5 < 10 && 10 > 5</p>
  <a href="/tools">工具列表</a>
</div>`;

const REFERENCE = [
  { entity: '&amp;', char: '&', note: '与号，必须最先转义' },
  { entity: '&lt;', char: '<', note: '小于号，防止标签注入' },
  { entity: '&gt;', char: '>', note: '大于号' },
  { entity: '&quot;', char: '"', note: '双引号，属性值内必须转义' },
  { entity: '&#39;', char: "'", note: '单引号' },
  { entity: '&nbsp;', char: ' ', note: '不换行空格' },
  { entity: '&copy;', char: '©', note: '版权符号' },
  { entity: '&reg;', char: '®', note: '注册商标' },
];

export default function HtmlEntities() {
  const tool = useToolMeta('html-entities');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'escape' | 'unescape'>('escape');
  const [input, setInput] = React.useState(SAMPLE);

  const output = React.useMemo(
    () => (mode === 'escape' ? escapeHtml(input) : unescapeHtml(input)),
    [input, mode],
  );

  const changed = React.useMemo(() => (output === input ? 0 : 1), [input, output]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'escape' ? 'unescape' : 'escape'))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            反转方向
          </button>
          <ClearButton onClear={() => setInput('')} />
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="text-[13px] text-muted-foreground">
          当前方向：
          <span className="font-medium text-foreground">
            {mode === 'escape' ? '原文 → HTML 实体' : 'HTML 实体 → 原文'}
          </span>
        </div>
        <div className="flex gap-2">
          {(['escape', 'unescape'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                mode === m
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground',
              )}
            >
              {m === 'escape' ? '转实体' : '还原原文'}
            </button>
          ))}
        </div>
      </div>

      <ToolIO
        input={
          <Panel title={mode === 'escape' ? '原始文本' : '含实体的文本'}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴文本…"
              className="min-h-56 font-mono text-[13px]"
              spellCheck={false}
            />
          </Panel>
        }
        output={
          <Panel
            title={mode === 'escape' ? '转义结果' : '还原结果'}
            actions={
              <CopyButton value={output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            <StatGrid
              columns={3}
              items={[
                { label: '输入长度', value: input.length },
                { label: '输出长度', value: output.length, tone: 'primary' },
                { label: '是否有变化', value: changed ? '是' : '否' },
              ]}
            />
            <Textarea
              value={output}
              readOnly
              placeholder="结果会显示在这里"
              className="mt-3 min-h-56 font-mono text-[13px]"
              spellCheck={false}
            />
          </Panel>
        }
      />

      <Panel title="常用实体速查" description="点击行内按钮复制">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2">实体</th>
                <th className="px-3 py-2">字符</th>
                <th className="px-3 py-2">说明</th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {REFERENCE.map((r, i) => (
                <tr
                  key={r.entity}
                  className={cn('border-t border-border', i % 2 === 1 && 'bg-surface-2/40')}
                >
                  <td className="px-3 py-2 font-mono text-primary">{r.entity}</td>
                  <td className="px-3 py-2 font-mono text-foreground">{r.char}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.note}</td>
                  <td className="px-3 py-2">
                    <CopyIconButton value={r.entity} sourceLabel={r.entity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </ToolView>
  );
}
