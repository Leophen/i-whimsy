'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import {
  formatJson,
  minifyJson,
  parseLooseJson,
  validateJson,
  type JsonIndent,
} from '@/lib/core/data';
import { byteSize } from '@/lib/core/text';
import { formatBytes } from '@/lib/utils';

const SAMPLE = `{"name":"iWhimsy","tools":45,"categories":["text","crypto","image"],"local":true,"meta":{"version":"2.0","author":"Leophen"}}`;

export default function JsonFormatter() {
  const tool = useToolMeta('json-formatter');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [indent, setIndent] = React.useState<JsonIndent>(2);
  const [mode, setMode] = React.useState<'beautify' | 'minify'>('beautify');

  const validation = React.useMemo(() => validateJson(input), [input]);

  const output = React.useMemo(() => {
    if (!validation.valid) return '';
    try {
      return mode === 'beautify' ? formatJson(input, indent) : minifyJson(input);
    } catch {
      return '';
    }
  }, [input, indent, mode, validation.valid]);

  const looseOk = React.useMemo(() => {
    if (validation.valid) return false;
    return parseLooseJson(input) !== null;
  }, [validation.valid, input]);

  const fixLoose = () => {
    const parsed = parseLooseJson(input);
    if (parsed !== null) setInput(JSON.stringify(parsed, null, indent === 'tab' ? '\t' : indent));
  };

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
              { value: 'beautify', label: '美化' },
              { value: 'minify', label: '压缩' },
            ]}
          />
          <ClearButton onClear={() => setInput('')} />
          <CopyButton value={output} sourceLabel="格式化结果" variant="secondary">
            复制结果
          </CopyButton>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">缩进</span>
          <SegmentedControl
            size="sm"
            value={String(indent)}
            onValueChange={(v) => setIndent(v === 'tab' ? 'tab' : (Number(v) as 2 | 4))}
            options={[
              { value: '2', label: '2 空格' },
              { value: '4', label: '4 空格' },
              { value: 'tab', label: 'Tab' },
            ]}
          />
        </div>
        {input.trim() && (
          <Badge variant={validation.valid ? 'success' : 'danger'} size="md">
            {validation.valid ? (
              <>
                <Check className="size-3" /> JSON 合法
              </>
            ) : (
              <>
                <X className="size-3" /> JSON 有错
              </>
            )}
          </Badge>
        )}
      </div>

      <ToolIO
        input={
          <Panel title="输入 JSON">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴 JSON…"
              className="min-h-72 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(input.trim()) && !validation.valid}
            />
          </Panel>
        }
        output={
          <Panel
            title={mode === 'beautify' ? '美化结果' : '压缩结果'}
            actions={
              <CopyButton value={output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {!input.trim() ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                输入 JSON 后自动格式化
              </p>
            ) : !validation.valid ? (
              <div className="space-y-3">
                <Notice tone="danger">
                  <div className="space-y-1">
                    <div className="font-medium">{validation.error?.message ?? '解析失败'}</div>
                    {validation.error?.line !== undefined && (
                      <div className="font-mono text-[11px]">
                        位置：第 {validation.error.line} 行，第 {validation.error.column} 列
                      </div>
                    )}
                  </div>
                </Notice>
                {looseOk && (
                  <button
                    type="button"
                    onClick={fixLoose}
                    className="h-9 w-full rounded-lg border border-primary/40 bg-primary-subtle px-3 text-[13px] font-medium text-primary transition-colors hover:bg-primary-subtle/70"
                  >
                    检测到注释或尾随逗号 —— 点此自动修复
                  </button>
                )}
              </div>
            ) : (
              <>
                <StatGrid
                  columns={2}
                  items={[
                    { label: '原始大小', value: formatBytes(byteSize(input)) },
                    {
                      label: mode === 'beautify' ? '美化后' : '压缩后',
                      value: formatBytes(byteSize(output)),
                      tone: 'primary',
                    },
                  ]}
                />
                <Textarea
                  value={output}
                  readOnly
                  className="mt-3 min-h-72 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      <Notice tone="info">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral" size="sm">
            提示
          </Badge>
          接口返回的 JSON 常带注释或尾随逗号（JSON5 风格），标准{' '}
          <code className="font-mono">JSON.parse</code> 会报错 —— 这里能识别出来并一键修复成合法
          JSON。
        </div>
      </Notice>
    </ToolView>
  );
}
