'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { formatXml, validateXml } from '@/lib/core/data';
import { byteSize } from '@/lib/core/text';
import { formatBytes } from '@/lib/utils';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?><catalog><tool id="1"><name>JSON 格式化</name><category>data</category></tool><tool id="2"><name>图片压缩</name><category>image</category></tool></catalog>`;

export default function XmlFormatter() {
  const tool = useToolMeta('xml-formatter');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [indent, setIndent] = React.useState(2);

  const validation = React.useMemo(() => validateXml(input), [input]);

  const output = React.useMemo(() => {
    if (!validation.valid || !input.trim()) return '';
    try {
      return formatXml(input, indent);
    } catch {
      return '';
    }
  }, [input, indent, validation.valid]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
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
            onValueChange={(v) => setIndent(Number(v))}
            options={[
              { value: '2', label: '2 空格' },
              { value: '4', label: '4 空格' },
            ]}
          />
        </div>
        {input.trim() && (
          <Badge variant={validation.valid ? 'success' : 'danger'} size="md">
            {validation.valid ? (
              <>
                <Check className="size-3" /> XML 合法
              </>
            ) : (
              <>
                <X className="size-3" /> XML 有错
              </>
            )}
          </Badge>
        )}
      </div>

      <ToolIO
        input={
          <Panel title="输入 XML">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴 XML…"
              className="min-h-72 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(input.trim()) && !validation.valid}
            />
          </Panel>
        }
        output={
          <Panel
            title="格式化结果"
            actions={
              <CopyButton value={output} sourceLabel="结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {!input.trim() ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                输入 XML 后自动美化并校验
              </p>
            ) : !validation.valid ? (
              <Notice tone="danger">
                <div className="space-y-1">
                  <div className="font-medium">XML 结构有误</div>
                  <div className="font-mono text-[11px]">{validation.error}</div>
                  <div className="text-[11px]">
                    常见原因：标签未闭合、属性值缺引号、存在非法字符（&amp; 需写成 &amp;amp;）
                  </div>
                </div>
              </Notice>
            ) : (
              <>
                <StatGrid
                  columns={2}
                  items={[
                    { label: '原始大小', value: formatBytes(byteSize(input)) },
                    { label: '格式化后', value: formatBytes(byteSize(output)), tone: 'primary' },
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
            说明
          </Badge>
          校验用 fast-xml-parser 的 <code className="font-mono">XMLValidator</code>，
          能定位到出错的行列；美化只做缩进与换行，不改变节点顺序与属性内容。 处理 SOAP
          报文、老系统配置文件、AndroidManifest 时很方便。
        </div>
      </Notice>
    </ToolView>
  );
}
