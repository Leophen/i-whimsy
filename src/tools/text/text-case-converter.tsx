'use client';

import * as React from 'react';
import { ArrowDown } from 'lucide-react';

import { CopyButton, ClearButton } from '@/components/tool/bits';
import { Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { copyToClipboard } from '@/lib/core/browser';
import { CASE_MODES, convertCase, tokenizeWords } from '@/lib/core/text';
import { cn } from '@/lib/utils';

const SAMPLE = 'iWhimsy frontend toolkit getUserInfo HTTPResponse hello_world 你好世界';

export default function TextCaseConverter() {
  const tool = useToolMeta('text-case-converter');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const words = React.useMemo(() => tokenizeWords(input), [input]);

  const results = React.useMemo(
    () => CASE_MODES.map((m) => ({ ...m, output: input ? convertCase(input, m.value) : '' })),
    [input],
  );

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton onClear={() => setInput('')} />
          <CopyButton value={input} sourceLabel="原文" variant="secondary">
            复制原文
          </CopyButton>
        </>
      }
    >
      <ToolIO
        split="wide-output"
        input={
          <Panel title="输入文本" description="支持任意写法：驼峰、下划线、空格或中文混排">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此粘贴或输入要转换的文本…"
              className="min-h-56 font-mono text-[13px]"
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>识别到 {words.length} 个词：</span>
              {words.slice(0, 12).map((w, i) => (
                <code
                  key={`${w}-${i}`}
                  className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                >
                  {w}
                </code>
              ))}
              {words.length > 12 && <span>…等共 {words.length} 个</span>}
              {words.length === 0 && <span>输入内容后自动分词</span>}
            </div>
          </Panel>
        }
        output={
          <Panel
            title="转换结果"
            description="共 17 种命名风格，点击卡片即可复制"
            actions={
              <CopyButton
                value={() => results.map((r) => `${r.label}: ${r.output}`).join('\n')}
                sourceLabel="全部结果"
                size="xs"
              >
                复制全部
              </CopyButton>
            }
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {results.map((r) => (
                <ResultCard key={r.value} label={r.label} hint={r.hint} value={r.output} />
              ))}
            </div>
          </Panel>
        }
      />
    </ToolView>
  );
}

function ResultCard({ label, hint, value }: { label: string; hint: string; value: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`复制 ${label} 的结果`}
      className={cn(
        'group flex flex-col items-start gap-1 rounded-xl border border-border bg-background px-3 py-2.5 text-left',
        'transition-all duration-150 hover:border-primary/45 hover:bg-primary-subtle/40',
        'focus-visible:ring-[3px] focus-visible:ring-primary/25 focus-visible:outline-none',
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            'text-[10px] transition-opacity',
            copied
              ? 'text-success opacity-100'
              : 'text-subtle-foreground opacity-0 group-hover:opacity-100',
          )}
        >
          {copied ? '已复制' : hint}
        </span>
      </div>
      <span className="line-clamp-3 w-full break-all font-mono text-[13px] leading-relaxed text-foreground">
        {value || <ArrowDown className="size-3 text-subtle-foreground" />}
      </span>
    </button>
  );
}
