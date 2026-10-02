'use client';

import * as React from 'react';
import { BarChart3 } from 'lucide-react';

import { ClearButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/card';
import { analyzeText, byteSize } from '@/lib/core/text';
import { formatNumber } from '@/lib/utils';

const SAMPLE = `iWhimsy 是跑在浏览器里的前端工具库 🚀
所有计算都在本地完成，没有一次网络请求。

All you need is a browser.`;

export default function TextStatistics() {
  const tool = useToolMeta('text-statistics');
  useTrackRecent(tool.slug);

  const [input, setInput] = React.useState(SAMPLE);
  const stats = React.useMemo(() => analyzeText(input), [input]);

  const topWords = React.useMemo(() => {
    const freq = new Map<string, number>();
    for (const w of input.toLowerCase().match(/[a-z0-9'-]+|[\u4e00-\u9fff]/g) ?? []) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
  }, [input]);

  const hasInput = input.trim().length > 0;

  return (
    <ToolView tool={tool} actions={<ClearButton onClear={() => setInput('')} />}>
      <ToolIO
        split="wide-input"
        input={
          <Panel title="输入文本" description="支持中英混排、emoji 与多段落，边输边统计">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="在此粘贴或输入文本…"
              className="min-h-72 text-[13px] leading-relaxed"
              spellCheck={false}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              UTF-8 字节数按实际编码计算，emoji 与中文会占 3~4 字节；字符数按 Unicode 码点计，一个
              emoji 算 1 个。
            </p>
          </Panel>
        }
        output={
          <Panel title="统计结果" description="实时更新">
            {!hasInput ? (
              <EmptyState
                icon={<BarChart3 />}
                title="还没有内容"
                description="在左侧输入文本后即可看到统计"
              />
            ) : (
              <div className="space-y-3">
                <StatGrid
                  columns={3}
                  items={[
                    { label: '字符数', value: formatNumber(stats.chars), hint: '按 Unicode 码点' },
                    { label: '字数', value: formatNumber(stats.words), hint: '中英混合计法' },
                    { label: '行数', value: formatNumber(stats.lines) },
                  ]}
                />
                <StatGrid
                  columns={3}
                  items={[
                    {
                      label: 'UTF-8 字节',
                      value: formatNumber(byteSize(input)),
                      hint: '实际存储体积',
                    },
                    { label: '中文字符', value: formatNumber(stats.cjk) },
                    { label: '英文单词', value: formatNumber(stats.englishWords) },
                  ]}
                />
                <StatGrid
                  columns={3}
                  items={[
                    { label: '去重词数', value: formatNumber(stats.uniqueWords) },
                    { label: '数字', value: formatNumber(stats.digits) },
                    { label: '空格', value: formatNumber(stats.spaces) },
                  ]}
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-primary/25 bg-primary-subtle px-3.5 py-3">
                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      预计阅读时长
                    </div>
                    <div className="tabular mt-1 text-xl leading-tight font-semibold text-primary">
                      {stats.readingMinutes < 1 ? '不到 1' : formatNumber(stats.readingMinutes)}{' '}
                      分钟
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      中文 400 字/分钟 · 英文 200 词/分钟
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-3.5 py-3">
                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      平均词长
                    </div>
                    <div className="tabular mt-1 text-xl leading-tight font-semibold">
                      {stats.avgWordLength.toFixed(1)}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      最长词：{stats.longestWord || '—'}
                    </div>
                  </div>
                </div>

                {topWords.length > 0 && (
                  <div className="rounded-xl border border-border bg-background p-3.5">
                    <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      高频词 Top {topWords.length}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {topWords.map(([word, count]) => (
                        <Badge key={word} variant="neutral" size="sm">
                          {word}
                          <span className="tabular text-subtle-foreground">{count}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
