'use client';

import * as React from 'react';
import { ArrowLeftRight } from 'lucide-react';

import { ClearButton, CopyButton, StatGrid } from '@/components/tool/bits';
import { Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { fullToHalf, halfToFull } from '@/lib/core/text';

const SAMPLE = 'ｉＷｈｉｍｓｙ　前端工具库 １２３４５ ＡＢＣ\nhello world 12345 ABC';

export default function TextWidthConverter() {
  const tool = useToolMeta('text-width-converter');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const [direction, setDirection] = React.useState<'full' | 'half'>('half');

  const output = React.useMemo(
    () => (direction === 'full' ? halfToFull(input) : fullToHalf(input)),
    [input, direction],
  );

  const changed = React.useMemo(() => {
    let n = 0;
    const len = Math.min(input.length, output.length);
    for (let i = 0; i < len; i += 1) if (input[i] !== output[i]) n += 1;
    return n;
  }, [input, output]);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setDirection((d) => (d === 'full' ? 'half' : 'full'))}
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
        <div className="text-[13px] text-muted-foreground">
          当前方向：
          <span className="font-medium text-foreground">
            {direction === 'full' ? '半角 → 全角' : '全角 → 半角'}
          </span>
        </div>
        <div className="flex gap-2">
          {(['half', 'full'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={
                direction === d
                  ? 'h-8 rounded-lg border border-primary bg-primary-subtle px-3 text-xs font-medium text-primary'
                  : 'h-8 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground'
              }
            >
              {d === 'half' ? '转半角' : '转全角'}
            </button>
          ))}
        </div>
      </div>

      <ToolIO
        input={
          <Panel title="输入文本">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="粘贴包含全角或半角字符的文本…"
              className="min-h-60 font-mono text-[13px]"
              spellCheck={false}
            />
          </Panel>
        }
        output={
          <Panel
            title="转换结果"
            actions={
              <CopyButton value={output} sourceLabel="转换结果" size="xs">
                复制
              </CopyButton>
            }
          >
            <StatGrid
              columns={2}
              items={[
                { label: '字符总数', value: input.length },
                { label: '发生变化', value: changed, tone: 'primary' },
              ]}
            />
            <Textarea
              value={output}
              readOnly
              placeholder="结果会显示在这里"
              className="mt-3 min-h-60 font-mono text-[13px]"
              spellCheck={false}
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              全角字符（ＡＢＣ１２３　）占两个字符宽度，半角（ABC123 空格）占一个。 转换范围包含
              ASCII 可打印字符、空格与部分标点，中文字符不受影响。
            </p>
          </Panel>
        }
      />
    </ToolView>
  );
}
