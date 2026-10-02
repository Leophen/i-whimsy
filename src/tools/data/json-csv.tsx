'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { csvToJson, jsonToCsv } from '@/lib/core/data';
import { cn } from '@/lib/utils';

const JSON_SAMPLE = `[
  { "id": 1, "name": "文本大小写转换", "category": "text", "views": 12840 },
  { "id": 2, "name": "JSON 格式化", "category": "data", "views": 20315 },
  { "id": 3, "name": "图片压缩", "category": "image", "views": 9821 }
]`;

const CSV_SAMPLE = `id,name,category,views
1,文本大小写转换,text,12840
2,JSON 格式化,data,20315
3,图片压缩,image,9821`;

export default function JsonCsv() {
  const tool = useToolMeta('json-csv');
  useTrackRecent(tool.slug);

  const [direction, setDirection] = React.useState<'json2csv' | 'csv2json'>('json2csv');
  const [json, setJson] = React.useState(JSON_SAMPLE);
  const [csv, setCsv] = React.useState(CSV_SAMPLE);
  const [useHeaders, setUseHeaders] = React.useState(true);

  const result = React.useMemo(() => {
    if (direction === 'json2csv') {
      if (!json.trim()) return { output: '', error: null as string | null };
      try {
        return { output: jsonToCsv(json), error: null };
      } catch (err) {
        return { output: '', error: err instanceof Error ? err.message : '转换失败' };
      }
    }
    if (!csv.trim()) return { output: '', error: null as string | null };
    try {
      return { output: csvToJson(csv, useHeaders), error: null };
    } catch (err) {
      return { output: '', error: err instanceof Error ? err.message : '转换失败' };
    }
  }, [direction, json, csv, useHeaders]);

  const previewRows = React.useMemo(() => {
    if (direction === 'csv2json') return null;
    if (!result.output) return null;
    try {
      const parsed = JSON.parse(json) as unknown;
      if (!Array.isArray(parsed)) return null;
      const rows: Record<string, unknown>[] = parsed.map((r) =>
        r !== null && typeof r === 'object' && !Array.isArray(r)
          ? (r as Record<string, unknown>)
          : { value: r },
      );
      const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
      return { headers, rows: rows.slice(0, 50) };
    } catch {
      return null;
    }
  }, [json, direction, result.output]);

  const rowCount = React.useMemo(() => {
    if (direction === 'json2csv') {
      try {
        const p = JSON.parse(json) as unknown;
        return Array.isArray(p) ? p.length : 0;
      } catch {
        return 0;
      }
    }
    return csv.trim() ? Math.max(0, csv.trim().split('\n').length - (useHeaders ? 1 : 0)) : 0;
  }, [json, csv, direction, useHeaders]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 'json2csv' ? 'csv2json' : 'json2csv'))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <ArrowLeftRight className="size-3.5" />
            反转方向
          </button>
          <ClearButton
            onClear={() => {
              setJson('');
              setCsv('');
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
            { value: 'json2csv', label: 'JSON → CSV' },
            { value: 'csv2json', label: 'CSV → JSON' },
          ]}
        />
        {direction === 'csv2json' && (
          <SwitchRow
            label="首行作为表头"
            checked={useHeaders}
            onCheckedChange={setUseHeaders}
            className="gap-3"
          />
        )}
      </div>

      <ToolIO
        input={
          <Panel title={direction === 'json2csv' ? 'JSON 输入（对象数组）' : 'CSV 输入'}>
            <Textarea
              value={direction === 'json2csv' ? json : csv}
              onChange={(e) =>
                direction === 'json2csv' ? setJson(e.target.value) : setCsv(e.target.value)
              }
              placeholder={direction === 'json2csv' ? '[{ "a": 1 }, { "a": 2 }]' : 'a,b\n1,2'}
              className="min-h-64 font-mono text-[13px]"
              spellCheck={false}
              aria-invalid={Boolean(result.error)}
            />
          </Panel>
        }
        output={
          <Panel
            title={direction === 'json2csv' ? 'CSV 输出' : 'JSON 输出'}
            actions={
              <>
                <CopyButton value={result.output} sourceLabel="转换结果" size="xs">
                  复制
                </CopyButton>
                <DownloadButton
                  data={result.output}
                  filename={direction === 'json2csv' ? 'data.csv' : 'data.json'}
                  mimeType={direction === 'json2csv' ? 'text/csv' : 'application/json'}
                  sourceLabel="转换结果"
                  variant="ghost"
                  size="xs"
                >
                  下载
                </DownloadButton>
              </>
            }
          >
            {result.error ? (
              <Notice tone="danger">{result.error}</Notice>
            ) : (
              <>
                <StatGrid
                  columns={2}
                  items={[
                    { label: '数据行数', value: rowCount, tone: 'primary' },
                    { label: '输出字符', value: result.output.length },
                  ]}
                />
                <Textarea
                  value={result.output}
                  readOnly
                  className="mt-3 min-h-64 font-mono text-[13px]"
                  spellCheck={false}
                />
              </>
            )}
          </Panel>
        }
      />

      {previewRows && previewRows.rows.length > 0 && (
        <Panel title="表格预览" description={`共 ${rowCount} 行，最多显示 50 行`}>
          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-surface-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <tr>
                  {previewRows.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.rows.map((r, i) => (
                  <tr
                    key={i}
                    className={cn('border-t border-border', i % 2 === 1 && 'bg-surface-2/40')}
                  >
                    {previewRows.headers.map((h) => (
                      <td key={h} className="max-w-0 truncate px-3 py-1.5 font-mono text-[12px]">
                        {String(r[h] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Notice tone="info">
        JSON → CSV 会自动收集所有对象里出现过的字段作为表头，字段不齐的行留空； CSV → JSON 用 Papa
        Parse 解析，能正确处理引号包裹的逗号与换行。 Excel 打开 CSV 若中文乱码，另存时选 UTF-8 with
        BOM。
      </Notice>
    </ToolView>
  );
}
