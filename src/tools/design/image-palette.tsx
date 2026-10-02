'use client';

import * as React from 'react';

import { CopyButton, CopyIconButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { BusyOverlay } from '@/components/tool/bits';
import { EmptyState, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { useAsyncComputed } from '@/lib/hooks';
import { extractPalette, loadImageFromSrc, type PaletteSwatch } from '@/lib/core/image';
import { copyToClipboard } from '@/lib/core/browser';

function exportCss(swatches: PaletteSwatch[]): string {
  const lines = swatches.map((s, i) => `  --palette-${i + 1}: ${s.hex};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

function exportTailwind(swatches: PaletteSwatch[]): string {
  const entries = swatches.map((s, i) => `        ${i + 1}: '${s.hex}',`).join('\n');
  return `colors: {\n  palette: {\n${entries}\n  }\n}`;
}

function exportJson(swatches: PaletteSwatch[]): string {
  return JSON.stringify(
    swatches.map((s) => ({
      hex: s.hex,
      rgb: s.rgb,
      ratio: Math.round(s.ratio * 1000) / 10,
    })),
    null,
    2,
  );
}

export default function ImagePalette() {
  const tool = useToolMeta('image-palette');
  useTrackRecent(tool.slug);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; size: number; url: string } | null>(
    null,
  );
  const [colorCount, setColorCount] = React.useState(8);
  const [ignoreExtremes, setIgnoreExtremes] = React.useState(true);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [exportTab, setExportTab] = React.useState('css');

  const handleFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    imgRef.current = img;
    setFile(f);
    setPreview({ name: f.name, size: f.size, url });
  };

  const paletteJob = useAsyncComputed(
    async () => {
      const img = imgRef.current;
      if (!img) return null;
      let swatches = extractPalette(img, colorCount, 3);
      if (ignoreExtremes) {
        swatches = swatches.filter((s) => {
          const lum = 0.299 * s.rgb.r + 0.587 * s.rgb.g + 0.114 * s.rgb.b;
          return lum > 20 && lum < 235;
        });
      }
      return swatches;
    },
    [file, colorCount, ignoreExtremes],
    { delay: 150, enabled: Boolean(file) },
  );

  const swatches = React.useMemo(() => paletteJob.value ?? [], [paletteJob.value]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const maxW = 480;
    const ratio = Math.min(1, maxW / img.naturalWidth);
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (hoverIdx !== null && swatches[hoverIdx]) {
      const target = swatches[hoverIdx].rgb;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.data.length; i += 4) {
        const dr = Math.abs(data.data[i] - target.r);
        const dg = Math.abs(data.data[i + 1] - target.g);
        const db = Math.abs(data.data[i + 2] - target.b);
        if (dr + dg + db > 80) {
          data.data[i + 3] = 40;
        }
      }
      ctx.putImageData(data, 0, 0);
    }
  }, [preview, hoverIdx, swatches]);

  const exportContent =
    exportTab === 'css'
      ? exportCss(swatches)
      : exportTab === 'tailwind'
        ? exportTailwind(swatches)
        : exportJson(swatches);

  return (
    <ToolView tool={tool}>
      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="上传图片">
              <FileDropzone
                onFile={handleFile}
                current={preview}
                onRemove={() => {
                  setFile(null);
                  setPreview(null);
                  imgRef.current = null;
                }}
              />
              {file && (
                <>
                  <SliderRow
                    label="提取色数"
                    value={colorCount}
                    onChange={setColorCount}
                    min={4}
                    max={16}
                    step={1}
                    className="mt-4"
                  />
                  <SwitchRow
                    label="忽略接近黑/白"
                    checked={ignoreExtremes}
                    onCheckedChange={setIgnoreExtremes}
                    className="mt-3"
                  />
                </>
              )}
            </Panel>
          </div>
        }
        output={
          <Panel title="提取结果" bodyClassName="relative min-h-[320px]">
            <BusyOverlay show={paletteJob.pending} label="分析颜色…" />
            {!file ? (
              <EmptyState title="上传图片开始取色" description="支持 JPG / PNG / WebP" />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="relative overflow-hidden rounded-xl border border-border">
                  <canvas ref={canvasRef} className="w-full" />
                </div>

                <div className="flex h-10 overflow-hidden rounded-lg">
                  {swatches.map((s, i) => (
                    <button
                      key={s.hex}
                      type="button"
                      style={{
                        background: s.hex,
                        flex: Math.max(0.08, s.ratio),
                      }}
                      className="relative transition-opacity hover:opacity-90"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                      onFocus={() => setHoverIdx(i)}
                      onBlur={() => setHoverIdx(null)}
                      onClick={() => {
                        setHoverIdx(i);
                        void copyToClipboard(s.hex);
                      }}
                      title={`${s.hex} · ${(s.ratio * 100).toFixed(1)}%`}
                    />
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {swatches.map((s, i) => (
                    <div
                      key={s.hex}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5"
                      onMouseEnter={() => setHoverIdx(i)}
                      onMouseLeave={() => setHoverIdx(null)}
                      onFocus={() => setHoverIdx(i)}
                      onBlur={() => setHoverIdx(null)}
                    >
                      <span
                        className="size-10 shrink-0 rounded-lg border border-border"
                        style={{ background: s.hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-medium">{s.hex}</p>
                        <p className="text-xs text-muted-foreground">
                          占比 {(s.ratio * 100).toFixed(1)}%
                        </p>
                      </div>
                      <CopyIconButton value={s.hex} sourceLabel="色值" />
                    </div>
                  ))}
                </div>

                <StatGrid
                  columns={3}
                  items={[
                    { label: '主色数', value: swatches.length },
                    {
                      label: '主色占比',
                      value: swatches[0] ? `${(swatches[0].ratio * 100).toFixed(1)}%` : '—',
                      tone: 'primary',
                    },
                    {
                      label: '合计',
                      value: `${(swatches.reduce((a, s) => a + s.ratio, 0) * 100).toFixed(0)}%`,
                      hint: '基于降采样估算',
                    },
                  ]}
                />

                <Panel title="导出">
                  <SegmentedControl
                    value={exportTab}
                    onValueChange={setExportTab}
                    options={[
                      { value: 'css', label: 'CSS 变量' },
                      { value: 'tailwind', label: 'Tailwind' },
                      { value: 'json', label: 'JSON' },
                    ]}
                  />
                  <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs">
                    {exportContent}
                  </pre>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <CopyButton value={exportContent} sourceLabel="导出内容" />
                    <DownloadButton
                      data={exportContent}
                      filename={`palette.${exportTab === 'json' ? 'json' : exportTab === 'tailwind' ? 'js' : 'css'}`}
                      mimeType="text/plain"
                      sourceLabel="文件"
                    >
                      下载文件
                    </DownloadButton>
                  </div>
                </Panel>
              </div>
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
