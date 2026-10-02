'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { escapeJsonString, unescapeJsonString } from '@/lib/core/encoding';

const SAMPLE_TEXT = `第一行
第二行带"引号"与\\反斜杠
第三行\t带制表符`;

export default function JsonEscape() {
  const tool = useToolMeta('json-escape');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'escape' | 'unescape'>('escape');
  const [input, setInput] = React.useState(SAMPLE_TEXT);

  const output = React.useMemo(() => {
    if (!input) return '';
    try {
      return mode === 'escape' ? escapeJsonString(input) : unescapeJsonString(input);
    } catch {
      return '';
    }
  }, [input, mode]);

  const error = React.useMemo(() => {
    if (!input || mode !== 'unescape') return null;
    try {
      unescapeJsonString(input);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : '去转义失败';
    }
  }, [input, mode]);

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
        <SegmentedControl
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'escape', label: '转义 → JSON 串' },
            { value: 'unescape', label: '去转义 → 原文' },
          ]}
        />
        <span className="text-xs text-muted-foreground">
          {mode === 'escape'
            ? '把换行、引号、反斜杠转成 \\n \\" \\\\ 等转义序列'
            : '把 \\n \\" \\\\ 还原成真实字符'}
        </span>
      </div>

      <ToolIO
        input={
          <Panel title={mode === 'escape' ? '原始字符串' : '转义字符串'}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'escape' ? '粘贴原始文本…' : '粘贴带 \\n 的转义串…'}
              className="min-h-60 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(error)}
            />
          </Panel>
        }
        output={
          <Panel
            title={mode === 'escape' ? 'JSON 转义结果' : '还原结果'}
            actions={
              <CopyButton value={output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {error ? (
              <Notice tone="danger">{error}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={2}
                  items={[
                    { label: '输入长度', value: input.length },
                    { label: '输出长度', value: output.length, tone: 'primary' },
                  ]}
                />
                <Textarea
                  value={output}
                  readOnly
                  className="mt-3 min-h-60 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        常见用途：把多行文本塞进 JSON 字段、把日志里被转义过的报文还原成人能读的样子、
        在代码里写死一段含换行的字符串常量。转义只处理 JSON 规定的那几个字符，不会动中文。
      </Notice>
    </ToolView>
  );
}
