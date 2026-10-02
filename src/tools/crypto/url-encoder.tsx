'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import {
  decodeUrl,
  decodeUrlComponent,
  encodeUrl,
  encodeUrlComponent,
  parseQueryString,
} from '@/lib/core/encoding';
import { cn } from '@/lib/utils';

const SAMPLE = 'https://i-whimsy.vercel.app/tools?q=前端工具库&page=1&tags=json%2Cyaml';

/** 编码强度：component 会连 / ? & = 一起编码，whole 保留 URL 结构 */
type Strength = 'component' | 'whole';

export default function UrlEncoder() {
  const tool = useToolMeta('url-encoder');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'encode' | 'decode'>('encode');
  const [strength, setStrength] = React.useState<Strength>('whole');
  const [input, setInput] = React.useState(SAMPLE);

  // 结果与错误一起算出来 —— 渲染阶段不 setState
  const converted = React.useMemo<{ value: string; error: string | null }>(() => {
    if (!input) return { value: '', error: null };
    try {
      if (mode === 'encode') {
        return {
          value: strength === 'component' ? encodeUrlComponent(input) : encodeUrl(input),
          error: null,
        };
      }
      return {
        value: strength === 'component' ? decodeUrlComponent(input) : decodeUrl(input),
        error: null,
      };
    } catch (err) {
      return { value: '', error: err instanceof Error ? err.message : '转换失败' };
    }
  }, [input, mode, strength]);

  const output = converted.value;
  const error = converted.error;

  const queryParams = React.useMemo(() => {
    const target = mode === 'encode' ? input : output;
    const idx = target.indexOf('?');
    if (idx === -1) return null;
    const query = target.slice(idx + 1);
    if (!query) return null;
    try {
      return parseQueryString(query);
    } catch {
      return null;
    }
  }, [input, output, mode]);

  const paramEntries = queryParams ? Object.entries(queryParams) : [];

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setMode((m) => (m === 'encode' ? 'decode' : 'encode'))}
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
            { value: 'encode', label: '编码' },
            { value: 'decode', label: '解码' },
          ]}
        />
        <SegmentedControl
          size="sm"
          value={strength}
          onValueChange={setStrength}
          options={[
            { value: 'whole', label: '整个 URL' },
            { value: 'component', label: '参数值' },
          ]}
        />
      </div>

      <ToolIO
        split="wide-input"
        input={
          <Panel title={mode === 'encode' ? '原始 URL / 查询串' : '已编码的 URL'}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴 URL 或查询串…"
              className="min-h-44 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(error)}
            />
            <p className="mt-2.5 text-xs text-muted-foreground">
              {strength === 'whole'
                ? '整个 URL 模式会保留 : / ? & = # 等结构字符，只编码中文、空格与特殊符号。'
                : '参数值模式等价于 encodeURIComponent，连 / 和 & 也会编码，适合单独处理一个参数值。'}
            </p>
          </Panel>
        }
        output={
          <Panel
            title={mode === 'encode' ? '编码结果' : '解码结果'}
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
                  placeholder="结果会显示在这里"
                  className="mt-3 min-h-44 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      <Panel
        title="查询参数拆解"
        description={
          paramEntries.length
            ? `识别出 ${paramEntries.length} 个参数`
            : '输入带 ? 的 URL 后自动拆解'
        }
      >
        {paramEntries.length === 0 ? (
          <EmptyState
            title="没有查询参数"
            description="URL 里带上 ?key=value 即可在这里看到拆解结果"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-surface-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-3 py-2">参数名</th>
                  <th className="px-3 py-2">参数值</th>
                  <th className="w-16 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {paramEntries.map(([k, v], i) => (
                  <tr
                    key={k}
                    className={cn('border-t border-border', i % 2 === 1 && 'bg-surface-2/40')}
                  >
                    <td className="px-3 py-2 font-mono text-primary">{k}</td>
                    <td className="max-w-0 truncate px-3 py-2 font-mono text-foreground">{v}</td>
                    <td className="px-3 py-2">
                      <CopyIconButton value={v} sourceLabel={`参数 ${k} 的值`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ToolView>
  );
}
