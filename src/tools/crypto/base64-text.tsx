'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { decodeBase64, encodeBase64, isBase64 } from '@/lib/core/encoding';
import { byteSize } from '@/lib/core/text';

const SAMPLE = 'iWhimsy · 浏览器里的前端工具库 🚀';

export default function Base64Text() {
  const tool = useToolMeta('base64-text');
  useTrackRecent(tool.slug);

  const [mode, setMode] = React.useState<'encode' | 'decode'>('encode');
  const [plain, setPlain] = React.useState(SAMPLE);
  const [encoded, setEncoded] = React.useState('');
  const [urlSafe, setUrlSafe] = React.useState(false);

  // 解码结果连同错误信息一起算出来 —— 不在 useMemo / 渲染阶段 setState
  const decoded = React.useMemo(() => {
    if (mode !== 'decode' || !encoded.trim()) return { value: '', error: null };
    try {
      return { value: decodeBase64(encoded.trim()), error: null };
    } catch (err) {
      return {
        value: '',
        error: (err instanceof Error ? err.message : 'Base64 解码失败') as string,
      };
    }
  }, [encoded, mode]);

  const error = decoded.error;

  const encodedOut = React.useMemo(() => {
    if (mode !== 'encode') return '';
    if (!plain) return '';
    return encodeBase64(plain, urlSafe);
  }, [plain, urlSafe, mode]);

  const swap = () => {
    if (mode === 'encode') {
      setEncoded(encodeBase64(plain, urlSafe));
      setMode('decode');
    } else {
      setPlain(decoded.value);
      setMode('encode');
    }
  };

  const isEncode = mode === 'encode';
  const output = isEncode ? encodedOut : decoded.value;

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
          <ClearButton
            onClear={() => {
              setPlain('');
              setEncoded('');
            }}
          />
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <SegmentedControl
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'encode', label: '编码 → Base64' },
            { value: 'decode', label: '解码 → 原文' },
          ]}
        />
        {isEncode && (
          <SwitchRow
            label="URL-safe 变体"
            checked={urlSafe}
            onCheckedChange={setUrlSafe}
            className="gap-3"
          />
        )}
      </div>

      <ToolIO
        input={
          <Panel title={isEncode ? '原文' : 'Base64 字符串'}>
            {isEncode ? (
              <Textarea
                value={plain}
                onChange={(e) => setPlain(e.target.value)}
                placeholder="输入要编码的文本，支持中文与 emoji…"
                className="min-h-56 font-mono text-[13px]"
                spellCheck={false}
              />
            ) : (
              <Textarea
                value={encoded}
                onChange={(e) => setEncoded(e.target.value)}
                placeholder="粘贴 Base64 字符串…"
                className="min-h-56 font-mono text-[13px]"
                spellCheck={false}
                aria-invalid={Boolean(error)}
              />
            )}
          </Panel>
        }
        output={
          <Panel
            title={isEncode ? 'Base64 结果' : '解码结果'}
            actions={
              <CopyButton value={output} sourceLabel={isEncode ? 'Base64' : '原文'} size="xs">
                复制
              </CopyButton>
            }
          >
            {error ? (
              <Notice tone="danger">{error}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={3}
                  items={[
                    { label: '输入字节', value: isEncode ? byteSize(plain) : byteSize(encoded) },
                    { label: '输出字节', value: byteSize(output) },
                    {
                      label: '膨胀率',
                      value: (() => {
                        const inSize = isEncode ? byteSize(plain) : byteSize(encoded);
                        if (!inSize) return '—';
                        return `${((byteSize(output) / inSize) * 100).toFixed(0)}%`;
                      })(),
                    },
                  ]}
                />
                <Textarea
                  value={output}
                  readOnly
                  placeholder="结果会显示在这里"
                  className="mt-3 min-h-56 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        原生 <code className="font-mono">btoa()</code> 遇到中文会抛
        <code className="font-mono"> InvalidCharacterError</code>。这里先把文本按 UTF-8
        编码成字节再转 Base64，中文、emoji 都能正确处理。
        {!isEncode && encoded.trim() && !isBase64(encoded.trim()) && (
          <span className="text-warning"> 当前输入看起来不是合法 Base64，解码可能失败。</span>
        )}
      </Notice>
    </ToolView>
  );
}
