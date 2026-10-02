'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Textarea } from '@/components/ui/input';
import { generateLorem, type LoremUnit } from '@/lib/core/generator';
import { analyzeText } from '@/lib/core/text';

export default function LoremIpsum() {
  const tool = useToolMeta('lorem-ipsum');
  useTrackRecent(tool.slug);

  const [unit, setUnit] = React.useState<LoremUnit>('paragraphs');
  const [count, setCount] = React.useState(3);
  const [startWithLorem, setStartWithLorem] = React.useState(true);
  const [nonce, setNonce] = React.useState(0);

  const text = React.useMemo(
    () => generateLorem({ count, unit, startWithLorem }),
    // nonce 用于手动触发重新生成
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, unit, startWithLorem, nonce],
  );

  const stats = React.useMemo(() => analyzeText(text), [text]);

  const maxByUnit = unit === 'words' ? 500 : unit === 'sentences' ? 50 : 20;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            重新生成
          </button>
          <CopyButton value={text} sourceLabel="占位文本" variant="secondary">
            复制
          </CopyButton>
          <DownloadButton
            data={text}
            filename="lorem-ipsum.txt"
            mimeType="text/plain"
            sourceLabel="占位文本"
            variant="ghost"
            size="sm"
          >
            下载
          </DownloadButton>
        </>
      }
    >
      <Panel title="生成选项" bodyClassName="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            size="sm"
            value={unit}
            onValueChange={(v) => {
              setUnit(v);
              setCount(v === 'words' ? 100 : v === 'sentences' ? 10 : 3);
            }}
            options={[
              { value: 'words', label: '按字数' },
              { value: 'sentences', label: '按句子' },
              { value: 'paragraphs', label: '按段落' },
            ]}
          />
          <SwitchRow
            label="以 Lorem ipsum 开头"
            checked={startWithLorem}
            onCheckedChange={setStartWithLorem}
            className="gap-3"
          />
        </div>

        <SliderRow
          label={unit === 'words' ? '字数' : unit === 'sentences' ? '句子数' : '段落数'}
          value={count}
          onChange={setCount}
          min={1}
          max={maxByUnit}
          suffix={unit === 'words' ? ' 词' : unit === 'sentences' ? ' 句' : ' 段'}
        />
      </Panel>

      <Panel
        title="生成结果"
        description={`${stats.chars} 字符 · ${stats.words} 词 · ${stats.lines} 段`}
        actions={
          <CopyButton value={text} sourceLabel="占位文本" size="xs">
            复制
          </CopyButton>
        }
      >
        <Textarea
          value={text}
          readOnly
          className="min-h-72 text-[13px] leading-relaxed"
          spellCheck={false}
        />
        <div className="mt-3">
          <StatGrid
            columns={4}
            items={[
              { label: '字符数', value: stats.chars, tone: 'primary' },
              { label: '词数', value: stats.words },
              { label: '段落数', value: stats.lines },
              {
                label: '预估阅读',
                value: `${stats.readingMinutes < 1 ? '<1' : Math.round(stats.readingMinutes)} 分钟`,
              },
            ]}
          />
        </div>
      </Panel>
    </ToolView>
  );
}
