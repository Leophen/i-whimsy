'use client';

import * as React from 'react';
import { Shuffle } from 'lucide-react';

import { CopyButton, DownloadButton, ResetButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { DEFAULT_WAVE, buildWaveSvg, type WaveParams } from '@/lib/core/css';
import { cn } from '@/lib/utils';

type Orientation = 'bottom' | 'top';

export default function SvgWaveGenerator() {
  const tool = useToolMeta('svg-wave-generator');
  useTrackRecent(tool.slug);

  const [p, setP] = React.useState<WaveParams>(DEFAULT_WAVE);
  const [orientation, setOrientation] = React.useState<Orientation>('bottom');
  const [bgColor, setBgColor] = React.useState('#ffffff');
  const [showBg, setShowBg] = React.useState(true);
  const patch = (next: Partial<WaveParams>) => setP((prev) => ({ ...prev, ...next }));

  const svg = React.useMemo(() => {
    const params: WaveParams =
      orientation === 'bottom' ? p : { ...p, baseline: 1 - p.baseline, amplitude: -p.amplitude };
    return buildWaveSvg(params);
  }, [p, orientation]);

  const dataUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [svg]);

  const cssSnippet = `.wave {\n  background-image: url("${dataUrl || '...'}");\n  background-size: 100% 100%;\n  background-repeat: no-repeat;\n}`;

  /** 预览时用内联 svg，避免 data URL 在暗色下的额外请求 */
  const previewSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  const randomize = () =>
    setP((prev) => ({
      ...prev,
      waves: 1 + Math.floor(Math.random() * 6),
      amplitude: Math.round((0.15 + Math.random() * 0.35) * 100) / 100,
      baseline: Math.round((0.35 + Math.random() * 0.3) * 100) / 100,
      smoothness: Math.round(Math.random() * 100) / 100,
      layers: 2 + Math.floor(Math.random() * 3),
    }));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <ResetButton onReset={() => setP(DEFAULT_WAVE)} />
          <DownloadButton
            data={svg}
            filename="wave.svg"
            mimeType="image/svg+xml"
            sourceLabel="SVG"
            variant="secondary"
          >
            下载 SVG
          </DownloadButton>
          <CopyButton value={svg} sourceLabel="SVG 代码">
            复制 SVG
          </CopyButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Panel
          title="波形参数"
          actions={
            <button
              type="button"
              onClick={randomize}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Shuffle className="size-3" />
              随机
            </button>
          }
        >
          <div className="space-y-3.5">
            <SliderRow
              label="波峰数量"
              value={p.waves}
              onChange={(v) => patch({ waves: v })}
              min={1}
              max={10}
            />
            <SliderRow
              label="振幅"
              value={Math.round(p.amplitude * 100)}
              onChange={(v) => patch({ amplitude: v / 100 })}
              min={0}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="基线位置"
              value={Math.round(p.baseline * 100)}
              onChange={(v) => patch({ baseline: v / 100 })}
              min={0}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="层数"
              value={p.layers}
              onChange={(v) => patch({ layers: v })}
              min={1}
              max={5}
            />
            <SliderRow
              label="平滑度"
              value={Math.round(p.smoothness * 100)}
              onChange={(v) => patch({ smoothness: v / 100 })}
              min={0}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="不透明度"
              value={p.opacity}
              onChange={(v) => patch({ opacity: v })}
              min={5}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="画布宽"
              value={p.width}
              onChange={(v) => patch({ width: v })}
              min={320}
              max={2560}
              step={20}
              suffix=" px"
            />
            <SliderRow
              label="画布高"
              value={p.height}
              onChange={(v) => patch({ height: v })}
              min={60}
              max={720}
              step={10}
              suffix=" px"
            />

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">颜色</span>
              <input
                type="color"
                value={p.color}
                onChange={(e) => patch({ color: e.target.value })}
                aria-label="波浪颜色"
                className="h-8 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
              <code className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                {p.color}
              </code>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-border pt-3.5">
            <div>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                朝向
              </span>
              <SegmentedControl
                size="sm"
                full
                value={orientation}
                onValueChange={setOrientation}
                options={[
                  { value: 'bottom', label: '底部' },
                  { value: 'top', label: '顶部' },
                ]}
                className="mt-1.5"
              />
            </div>
            <SwitchRow label="预览底色" checked={showBg} onCheckedChange={setShowBg} />
            {showBg && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">底色</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  aria-label="预览底色"
                  className="h-8 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
              </div>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="实时预览"
            description={`viewBox 0 0 ${p.width} ${p.height}，已按容器等比缩放`}
          >
            <div
              className="overflow-hidden rounded-xl border border-border"
              style={{ background: showBg ? bgColor : 'transparent' }}
            >
              {/* 用 img 渲染 data URL，保证与导出结果完全一致 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewSvg}
                alt="波浪预览"
                className="block w-full"
                style={{ height: 220 }}
              />
            </div>

            <div className="mt-3">
              <StatGrid
                columns={4}
                items={[
                  { label: '波峰', value: p.waves, tone: 'primary' },
                  { label: '层数', value: p.layers },
                  { label: '画布', value: `${p.width}×${p.height}` },
                  { label: '朝向', value: orientation === 'bottom' ? '底部' : '顶部' },
                ]}
              />
            </div>
          </Panel>

          <Panel
            title="SVG 代码"
            actions={
              <CopyButton value={svg} sourceLabel="SVG" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="scrollbar-none max-h-56 overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[11px] leading-relaxed break-all">
              {svg}
            </pre>
          </Panel>

          <Panel
            title="CSS 用法"
            actions={
              <CopyButton value={cssSnippet} sourceLabel="CSS" size="xs">
                复制
              </CopyButton>
            }
          >
            <pre className="scrollbar-none max-h-40 overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[11px] leading-relaxed break-all">
              {cssSnippet}
            </pre>
            <p className={cn('mt-3 text-xs leading-relaxed text-muted-foreground')}>
              SVG 上带了 <code className="font-mono">preserveAspectRatio=&quot;none&quot;</code>，
              可以任意拉伸填满容器；用作分区背景时建议外层再套一个固定高度的 div。
            </p>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}
