'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import {
  jsonToYaml,
  validateJson,
  validateYaml,
  yamlToJson,
  type JsonIndent,
} from '@/lib/core/data';
import { byteSize } from '@/lib/core/text';
import { formatBytes } from '@/lib/utils';

const JSON_SAMPLE = `{
  "name": "iWhimsy",
  "runtime": "browser",
  "tools": 45,
  "categories": ["text", "crypto", "image"],
  "meta": { "version": "2.0", "localOnly": true }
}`;

const YAML_SAMPLE = `name: iWhimsy
runtime: browser
tools: 45
categories:
  - text
  - crypto
  - image
meta:
  version: "2.0"
  localOnly: true
`;

export default function JsonYaml() {
  const tool = useToolMeta('json-yaml');
  useTrackRecent(tool.slug);

  const [direction, setDirection] = React.useState<'json2yaml' | 'yaml2json'>('json2yaml');
  const [json, setJson] = React.useState(JSON_SAMPLE);
  const [yaml, setYaml] = React.useState(YAML_SAMPLE);
  const [indent, setIndent] = React.useState<JsonIndent>(2);

  const result = React.useMemo(() => {
    if (direction === 'json2yaml') {
      if (!json.trim()) return { output: '', error: null as string | null };
      const v = validateJson(json);
      if (!v.valid) {
        return {
          output: '',
          error: v.error
            ? `JSON 有误：${v.error.message}${v.error.line ? `（第 ${v.error.line} 行第 ${v.error.column} 列）` : ''}`
            : 'JSON 有误',
        };
      }
      try {
        return { output: jsonToYaml(json, indent === 'tab' ? 2 : indent), error: null };
      } catch (err) {
        return { output: '', error: err instanceof Error ? err.message : '转换失败' };
      }
    }
    if (!yaml.trim()) return { output: '', error: null as string | null };
    const v = validateYaml(yaml);
    if (!v.valid) return { output: '', error: `YAML 有误：${v.error ?? '无法解析'}` };
    try {
      return { output: yamlToJson(yaml, indent), error: null };
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : '转换失败' };
    }
  }, [direction, json, yaml, indent]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 'json2yaml' ? 'yaml2json' : 'json2yaml'))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            反转方向
          </button>
          <ClearButton
            onClear={() => {
              setJson('');
              setYaml('');
            }}
          />
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <SegmentedControl
          size="sm"
          value={direction}
          onValueChange={setDirection}
          options={[
            { value: 'json2yaml', label: 'JSON → YAML' },
            { value: 'yaml2json', label: 'YAML → JSON' },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">缩进</span>
          <SegmentedControl
            size="sm"
            value={String(indent)}
            onValueChange={(v) => setIndent(Number(v) === 4 ? 4 : 2)}
            options={[
              { value: '2', label: '2' },
              { value: '4', label: '4' },
            ]}
          />
        </div>
      </div>

      <ToolIO
        input={
          <Panel title={direction === 'json2yaml' ? 'JSON 输入' : 'YAML 输入'}>
            <Textarea
              value={direction === 'json2yaml' ? json : yaml}
              onChange={(e) =>
                direction === 'json2yaml' ? setJson(e.target.value) : setYaml(e.target.value)
              }
              placeholder={direction === 'json2yaml' ? '粘贴 JSON…' : '粘贴 YAML…'}
              className="min-h-72 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(result.error)}
            />
          </Panel>
        }
        output={
          <Panel
            title={direction === 'json2yaml' ? 'YAML 输出' : 'JSON 输出'}
            actions={
              <CopyButton value={result.output} sourceLabel="转换结果" size="xs">
                复制
              </CopyButton>
            }
          >
            {result.error ? (
              <Notice tone="danger">{result.error}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={2}
                  items={[
                    {
                      label: '输入大小',
                      value: formatBytes(byteSize(direction === 'json2yaml' ? json : yaml)),
                    },
                    {
                      label: '输出大小',
                      value: formatBytes(byteSize(result.output)),
                      tone: 'primary',
                    },
                  ]}
                />
                <Textarea
                  value={result.output}
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
        <div className="space-y-1">
          <div>
            转换会保留键的原始顺序与嵌套结构；YAML 的时间戳、二进制等非 JSON 类型会被转成字符串。
          </div>
          <div>
            用 K8s 配置、CI 流水线、OpenAPI 文档互转时最常用 ——
            <code className="font-mono"> YAML → JSON</code> 适合落地到代码，
            <code className="font-mono"> JSON → YAML</code> 适合写配置。
          </div>
        </div>
      </Notice>
    </ToolView>
  );
}
