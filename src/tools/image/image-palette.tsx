'use client';

import * as React from 'react';
import { Droplets } from 'lucide-react';

import { CopyButton, CopyIconButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone, readImageFile, type LoadedImageMeta } from '@/components/tool/file-dropzone';
import { SliderRow } from '@/components/ui/controls';
import { Badge } from '@/components/ui/card';
import { dominantColor, extractPalette, loadImageFromSrc } from '@/lib/core/image';
import { readableTextColor } from '@/lib/core/color';
import { cn } from '@/lib/utils';

export default function ImagePalette() {
  const tool = useToolMeta('image-palette');
  useTrackRecent(tool.slug);

  const [image, setImage] = React.useState<LoadedImageMeta | null>(null);
  const [colorCount, setColorCount] = React.useState(8);
  const [imgEl, setImgEl] = React.useState<HTMLImageElement | null>(null);
  const [reading, setReading] = React.useState(false);
  const [readError, setReadError] = React.useState<string | null>(null);

  const handleFile = async (file: File) => {
    setReadError(null);
    setReading(true);
    try {
      const meta = await readImageFile(file);
      setImage(meta);
      setImgEl(await loadImageFromSrc(meta.url));
    } catch {
      setReadError('无法读取这张图片，换一个文件试试');
    } finally {
      setReading(false);
    }
  };

  // 抽色是纯同步计算，直接派生；拖滑杆时防抖由 colorCount 的变化频率天然限制
  const palette = React.useMemo(() => {
    if (!imgEl) return null;
    return {
      swatches: extractPalette(imgEl, colorCount),
      dominant: dominantColor(imgEl),
    };
  }, [imgEl, colorCount]);

  // 用 useMemo 固定引用，避免下游 useMemo 每次都重新计算 CSS 变量
  const swatches = React.useMemo(() => palette?.swatches ?? [], [palette]);
  const dominant = palette?.dominant ?? null;
  const busy = reading;

  const cssVariables = React.useMemo(
    () =>
      swatches
        .map((s, i) => `  --color-${i + 1}: ${s.hex}; /* ${(s.ratio * 100).toFixed(1)}% */`)
        .join('\n'),
    [swatches],
  );

  return (
    <ToolView tool={tool}>
      {!image ? (
        <Panel title="选择图片">
          <FileDropzone accept="image/*" onFile={handleFile} />
          {readError && (
            <Notice tone="danger" className="mt-3">
              {readError}
            </Notice>
          )}
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Panel title="图片与参数">
            <FileDropzone
              accept="image/*"
              onFile={handleFile}
              current={{ name: image.name, size: image.size, url: image.url }}
              onRemove={() => {
                setImage(null);
                setImgEl(null);
              }}
            />

            <div className="mt-4">
              <SliderRow
                label="提取色数"
                value={colorCount}
                onChange={setColorCount}
                min={3}
                max={16}
                suffix=" 色"
              />
            </div>

            <div className="mt-4 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="预览" className="max-h-full max-w-full object-contain" />
            </div>

            {dominant && (
              <div className="mt-3 rounded-xl border border-border bg-background p-3">
                <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  主色调
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className="size-10 rounded-lg border border-border"
                    style={{ background: dominant }}
                  />
                  <code className="font-mono text-[13px]">{dominant}</code>
                  <CopyIconButton value={dominant} sourceLabel="主色" />
                </div>
              </div>
            )}
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel
              title="配色方案"
              description={busy ? '提取中…' : '中位切分算法，按占比排序，点击色块复制'}
              actions={
                <CopyButton value={cssVariables} sourceLabel="CSS 变量" size="xs">
                  复制 CSS 变量
                </CopyButton>
              }
            >
              {swatches.length === 0 ? (
                <EmptyState icon={<Droplets />} title="提取中…" description="正在分析图片像素" />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {swatches.map((s, i) => (
                      <button
                        key={`${s.hex}-${i}`}
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(s.hex)}
                        title={`复制 ${s.hex}`}
                        className="group overflow-hidden rounded-xl border border-border transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        <span
                          className="flex h-20 items-end justify-end p-2"
                          style={{
                            background: s.hex,
                            color: readableTextColor(s.hex),
                          }}
                        >
                          <span className="font-mono text-[10px] opacity-80">
                            {(s.ratio * 100).toFixed(1)}%
                          </span>
                        </span>
                        <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                          <code className="font-mono text-[11px] text-foreground">{s.hex}</code>
                          <span className="text-[10px] text-subtle-foreground">
                            {s.rgb.r},{s.rgb.g},{s.rgb.b}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3">
                    <StatGrid
                      columns={3}
                      items={[
                        { label: '色数', value: swatches.length, tone: 'primary' },
                        {
                          label: '最高占比',
                          value: `${((swatches[0]?.ratio ?? 0) * 100).toFixed(1)}%`,
                        },
                        { label: '原图尺寸', value: `${image.width}×${image.height}` },
                      ]}
                    />
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                        CSS 变量
                      </span>
                      <Badge variant="neutral" size="sm">
                        可直接粘进 :root
                      </Badge>
                    </div>
                    <pre className="mt-2 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed">
                      {`:root {\n${cssVariables}\n}`}
                    </pre>
                  </div>

                  <div className="mt-3">
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      色带
                    </span>
                    <div
                      className={cn(
                        'mt-2 flex h-10 overflow-hidden rounded-xl border border-border',
                      )}
                    >
                      {swatches.map((s, i) => (
                        <span
                          key={`bar-${s.hex}-${i}`}
                          className="h-full"
                          style={{ background: s.hex, width: `${Math.max(s.ratio * 100, 4)}%` }}
                          title={`${s.hex} · ${(s.ratio * 100).toFixed(1)}%`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Panel>

            {swatches.length > 0 && (
              <Panel title="无障碍提示" description="用这些颜色做前景时，配什么文字色才达标">
                <div className="space-y-2">
                  {swatches.slice(0, 3).map((s, i) => (
                    <div
                      key={`a11y-${s.hex}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-6 rounded-md border border-border"
                          style={{ background: s.hex }}
                        />
                        <code className="font-mono text-[12px]">{s.hex}</code>
                      </span>
                      <span
                        className="rounded-md px-2 py-1 text-xs font-medium"
                        style={{
                          background: s.hex,
                          color: readableTextColor(s.hex),
                        }}
                      >
                        推荐文字色 {readableTextColor(s.hex)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  判定基于 WCAG 相对亮度公式，黑色或白色中对比度更高的那个即为推荐值。
                </p>
              </Panel>
            )}
          </div>
        </div>
      )}
    </ToolView>
  );
}
