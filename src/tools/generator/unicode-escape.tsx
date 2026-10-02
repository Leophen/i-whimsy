'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { escapeUnicode, unescapeUnicode } from '@/lib/core/encoding';

const SAMPLE = 'iWhimsy 前端工具库 🚀 中文 Emoji 通吃';

export default function UnicodeEscape() {
  const tool = useToolMeta('unicode-escape');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'escape' | 'unescape'>('escape');
  const [input, setInput] = React.useState(SAMPLE);
  const [asciiOnly, setAsciiOnly] = React.useState(false);

  const output = React.useMemo(() => {
    if (!input) return '';
    try {
      if (mode === 'escape') {
        const raw = escapeUnicode(input);
        if (!asciiOnly) return raw;
        // 只保留非 ASCII 的转义，ASCII 原样输出
        return raw.replace(/\\u([0-9a-fA-F]{4})/g, (m, hex: string) => {
          const code = parseInt(hex, 16);
          return code <= 0x7f ? String.fromCharCode(code) : m;
        });
      }
      return unescapeUnicode(input);
    } catch (err) {
      return err instanceof Error ? `转换失败：${err.message}` : '转换失败';
    }
  }, [input, mode, asciiOnly]);

  const escapedCount = React.useMemo(
    () =>
      mode === 'escape'
        ? (output.match(/\\u[0-9a-fA-F]{4}/g) ?? []).length
        : (input.match(/\\u[0-9a-fA-F]{4}/g) ?? []).length,
    [output, input, mode],
  );

  const failed = output.startsWith('转换失败');

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
            { value: 'escape', label: '文本 → \\uXXXX' },
            { value: 'unescape', label: '\\uXXXX → 文本' },
          ]}
        />
        {mode === 'escape' && (
          <SwitchRow
            label="只转义非 ASCII"
            description="中文和 emoji 转 \\u，英文字母保持原样"
            checked={asciiOnly}
            onCheckedChange={setAsciiOnly}
          />
        )}
      </div>

      <ToolIO
        input={
          <Panel title={mode === 'escape' ? '原始文本' : '转义字符串'}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'escape' ? '粘贴文本…' : '粘贴含 \\uXXXX 的字符串…'}
              className="min-h-60 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={failed}
            />
          </Panel>
        }
        output={
          <Panel
            title={mode === 'escape' ? '转义结果' : '还原结果'}
            actions={
              <CopyButton value={failed ? '' : output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {failed ? (
              <Notice tone="danger">{output}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '输入长度', value: input.length },
                    { label: '输出长度', value: output.length, tone: 'primary' },
                    { label: '转义序列', value: escapedCount },
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
        <div className="space-y-1">
          <div>
            <code className="font-mono">\uXXXX</code> 是 UCS-2 转义，只能表示 BMP 内的字符（U+0000 ~
            U+FFFF）。 emoji 这类超出 BMP 的字符会用<strong>代理对</strong>表示，即连续两个{' '}
            <code className="font-mono">\u</code> —— 这是正常现象，不是 bug。
          </div>
          <div>
            常见用途：排查乱码、在只支持 ASCII
            的配置文件里塞中文、绕过关键词过滤、查看某个字符的真实码点。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
