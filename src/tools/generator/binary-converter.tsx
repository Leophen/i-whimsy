'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { hexToText, textToHex } from '@/lib/core/encoding';
import { byteSize } from '@/lib/core/text';

const SAMPLE = 'iWhimsy 前端工具库 🚀';

export default function BinaryConverter() {
  const tool = useToolMeta('binary-converter');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'toBinary' | 'fromBinary'>('toBinary');
  const [format, setFormat] = React.useState<'binary' | 'hex'>('binary');
  const [input, setInput] = React.useState(SAMPLE);
  const [separator, setSeparator] = React.useState(' ');

  const output = React.useMemo(() => {
    if (!input) return { text: '', error: null as string | null };
    try {
      if (mode === 'toBinary') {
        const hex = textToHex(input, '');
        const bytes = hex.match(/.{1,2}/g) ?? [];
        if (format === 'hex') return { text: textToHex(input, separator), error: null };
        return {
          text: bytes.map((b) => parseInt(b, 16).toString(2).padStart(8, '0')).join(separator),
          error: null,
        };
      }
      // 反解
      if (format === 'hex') return { text: hexToText(input), error: null };
      const cleaned = input.replace(/[^01]/g, '');
      if (cleaned.length % 8 !== 0) {
        return { text: '', error: `二进制位数必须是 8 的倍数，当前 ${cleaned.length} 位` };
      }
      const bytes = cleaned.match(/.{8}/g) ?? [];
      const hex = bytes.map((b) => parseInt(b, 2).toString(16).padStart(2, '0')).join('');
      return { text: hexToText(hex), error: null };
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : '转换失败' };
    }
  }, [input, mode, format, separator]);

  const swap = () => {
    setMode(mode === 'toBinary' ? 'fromBinary' : 'toBinary');
    if (output.text) setInput(output.text);
  };

  const byteRows = React.useMemo(() => {
    if (mode !== 'toBinary' || !input) return [];
    const hex = textToHex(input, '');
    const bytes = hex.match(/.{1,2}/g) ?? [];
    const chars = Array.from(input);
    // 按字符分组展示：每个字符可能占 1~4 字节
    const groups: { char: string; bytes: string[] }[] = [];
    let cursor = 0;
    for (const ch of chars) {
      const size = byteSize(ch);
      groups.push({ char: ch, bytes: bytes.slice(cursor, cursor + size) });
      cursor += size;
    }
    return groups.slice(0, 64);
  }, [input, mode]);

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
            交换方向
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
            { value: 'toBinary', label: '文本 → 编码' },
            { value: 'fromBinary', label: '编码 → 文本' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            size="sm"
            value={format}
            onValueChange={setFormat}
            options={[
              { value: 'binary', label: '二进制' },
              { value: 'hex', label: '十六进制' },
            ]}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">分隔符</span>
            {[' ', '', '-'].map((s) => (
              <button
                key={s || 'none'}
                type="button"
                onClick={() => setSeparator(s)}
                className={
                  separator === s
                    ? 'rounded-md border border-primary bg-primary-subtle px-2 py-0.5 font-mono text-[11px] text-primary'
                    : 'rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-border-strong'
                }
              >
                {s === '' ? '无' : s === ' ' ? '空格' : '-'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ToolIO
        input={
          <Panel
            title={
              mode === 'toBinary' ? '原始文本' : `${format === 'binary' ? '二进制' : '十六进制'}串`
            }
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === 'toBinary'
                  ? '输入文本…'
                  : format === 'binary'
                    ? '01101000 01100101…'
                    : '68 65 6c 6c 6f'
              }
              className="min-h-52 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(output.error)}
            />
          </Panel>
        }
        output={
          <Panel
            title={
              mode === 'toBinary'
                ? `${format === 'binary' ? '二进制' : '十六进制'}结果`
                : '还原文本'
            }
            actions={
              <CopyButton value={output.text} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {output.error ? (
              <Notice tone="danger">{output.error}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '输入长度', value: input.length },
                    {
                      label: mode === 'toBinary' ? '字节数' : '输出长度',
                      value: mode === 'toBinary' ? byteSize(input) : output.text.length,
                      tone: 'primary',
                    },
                    {
                      label: '输出长度',
                      value: output.text.length,
                    },
                  ]}
                />
                <Textarea
                  value={output.text}
                  readOnly
                  className="mt-3 min-h-52 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      {byteRows.length > 0 && (
        <Panel title="逐字节拆解" description="看每个字符实际占几个字节（UTF-8）">
          <div className="max-h-72 overflow-auto rounded-xl border border-border">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-surface-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">字符</th>
                  <th className="px-3 py-2">字节数</th>
                  <th className="px-3 py-2">十六进制</th>
                  <th className="px-3 py-2">二进制</th>
                </tr>
              </thead>
              <tbody>
                {byteRows.map((g, i) => (
                  <tr key={`${g.char}-${i}`} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono text-[13px] text-primary">{g.char}</td>
                    <td className="tabular px-3 py-1.5 text-muted-foreground">{g.bytes.length}</td>
                    <td className="px-3 py-1.5 font-mono">{g.bytes.join(' ').toUpperCase()}</td>
                    <td className="max-w-0 truncate px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                      {g.bytes.map((b) => parseInt(b, 16).toString(2).padStart(8, '0')).join(' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">最多显示前 64 个字符。</p>
        </Panel>
      )}

      <Notice tone="info">
        <div className="space-y-1">
          <div>
            英文 ASCII 占 1 字节，中文通常占 3 字节，emoji 占 4 字节 ——
            这就是「字符数」和「字节数」对不上的原因。
          </div>
          <div>排查字符集问题、分析协议报文、确认某个字符到底存成了什么时最有用。</div>
        </div>
      </Notice>
    </ToolView>
  );
}
