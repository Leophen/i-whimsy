'use client';

import * as React from 'react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { CheckboxRow, RadioGroup } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { processLines, type LineMode } from '@/lib/core/text';

const SAMPLE = `banana
apple
Apple
cherry
banana

date
  fig  `;

const MODES: { value: LineMode; label: string; description?: string }[] = [
  { value: 'dedupe', label: '去重', description: '保留首次出现' },
  { value: 'unique', label: '仅保留唯一', description: '删掉所有重复项' },
  { value: 'sort-asc', label: '升序排序' },
  { value: 'sort-desc', label: '降序排序' },
  { value: 'shuffle', label: '随机打乱' },
  { value: 'reverse', label: '倒序反转' },
  { value: 'trim', label: '去除首尾空格' },
  { value: 'compact', label: '压缩空行' },
];

export default function TextSortDedupe() {
  const tool = useToolMeta('text-sort-dedupe');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [mode, setMode] = React.useState<LineMode>('dedupe');
  const [ignoreCase, setIgnoreCase] = React.useState(false);
  const [trimLine, setTrimLine] = React.useState(true);

  const { output, removed } = React.useMemo(
    () => processLines(input, { mode, ignoreCase, trimLine }),
    [input, mode, ignoreCase, trimLine],
  );

  const total = React.useMemo(() => (input ? input.split(/\r?\n/).length : 0), [input]);
  const kept = React.useMemo(() => (output ? output.split(/\r?\n/).length : 0), [output]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ClearButton onClear={() => setInput('')} />
          <CopyButton value={output} sourceLabel="处理结果" variant="secondary">
            复制结果
          </CopyButton>
        </>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <Panel title="原始文本" description="每行一条，粘贴名单、日志或标签列表">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="每行一条…"
              className="min-h-64 font-mono text-[13px]"
              spellCheck={false}
            />

            <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-2 p-3">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                处理方式
              </span>
              <RadioGroup
                options={MODES}
                value={mode}
                onValueChange={(v) => setMode(v as LineMode)}
              />
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 border-t border-border pt-3">
                <CheckboxRow
                  label="忽略大小写"
                  checked={ignoreCase}
                  onCheckedChange={setIgnoreCase}
                />
                <CheckboxRow
                  label="处理前先 trim 每行"
                  checked={trimLine}
                  onCheckedChange={setTrimLine}
                />
              </div>
            </div>
          </Panel>
        }
        output={
          <Panel
            title="处理结果"
            description={`移除 ${removed} 行`}
            actions={
              <CopyButton value={output} sourceLabel="处理结果" size="xs">
                复制
              </CopyButton>
            }
          >
            <StatGrid
              columns={3}
              items={[
                { label: '原始行数', value: total },
                { label: '结果行数', value: kept, tone: 'primary' },
                { label: '移除行数', value: removed, tone: removed > 0 ? 'warning' : 'default' },
              ]}
            />
            <Textarea
              value={output}
              readOnly
              placeholder="结果会显示在这里"
              className="mt-3 min-h-56 font-mono text-[13px]"
              spellCheck={false}
            />
            {mode === 'shuffle' && (
              <Notice tone="info" className="mt-3">
                随机打乱使用密码学安全随机数，每次结果都不同。
              </Notice>
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
