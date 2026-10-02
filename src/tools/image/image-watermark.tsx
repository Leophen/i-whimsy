'use client';

import * as React from 'react';
import { Stamp } from 'lucide-react';

import { DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone, readImageFile, type LoadedImageMeta } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Field, Input } from '@/components/ui/input';
import { Select } from '@/components/ui/controls';
import {
  DEFAULT_WATERMARK,
  addWatermark,
  loadImageFromSrc,
  type CompressResult,
  type OutputMime,
  type WatermarkParams,
} from '@/lib/core/image';
import { guessExtension, renameWithExt } from '@/lib/core/browser';
import { formatBytes } from '@/lib/utils';

const FONTS = [
  { value: 'sans-serif', label: '无衬线（默认）' },
  { value: 'serif', label: '衬线' },
  { value: 'monospace', label: '等宽' },
];

const FORMATS: { value: OutputMime; label: string }[] = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
];

const QUICK_COLORS = ['#ffffff', '#000000', '#ff3b30', '#ff9500', '#34c759', '#007aff'];

export default function ImageWatermark() {
  const tool = useToolMeta('image-watermark');
  useTrackRecent(tool.slug);

  const [image, setImage] = React.useState<LoadedImageMeta | null>(null);
  const [params, setParams] = React.useState<WatermarkParams>(DEFAULT_WATERMARK);
  const [mime, setMime] = React.useState<OutputMime>('image/png');
  const [result, setResult] = React.useState<CompressResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  const patch = <K extends keyof WatermarkParams>(key: K, value: WatermarkParams[K]) =>
    setParams((prev) => ({ ...prev, [key]: value }));

  const handleFile = async (file: File) => {
    setResult(null);
    const meta = await readImageFile(file);
    setImage(meta);
  };

  const apply = async () => {
    if (!image || !params.text) return;
    setBusy(true);
    try {
      const img = await loadImageFromSrc(image.url);
      const r = await addWatermark(img, params, mime, 0.92);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolView tool={tool}>
      {!image ? (
        <Panel title="选择图片">
          <FileDropzone accept="image/*" onFile={handleFile} />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Panel title="水印设置">
            <FileDropzone
              accept="image/*"
              onFile={handleFile}
              current={{ name: image.name, size: image.size, url: image.url }}
              onRemove={() => {
                setImage(null);
                setResult(null);
              }}
            />

            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <Field label="水印文字">
                <Input
                  value={params.text}
                  onChange={(e) => patch('text', e.target.value)}
                  placeholder="例如 © Your Name"
                  className="text-[13px]"
                />
              </Field>

              <SwitchRow
                label="居中单枚"
                description="关闭则全图斜向平铺"
                checked={params.single}
                onCheckedChange={(v) => patch('single', v)}
              />

              <div>
                <span className="text-xs font-medium text-muted-foreground">颜色</span>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={params.color}
                    onChange={(e) => patch('color', e.target.value)}
                    aria-label="水印颜色"
                    className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`使用颜色 ${c}`}
                        onClick={() => patch('color', c)}
                        className="size-6 rounded-md border border-border transition-transform hover:scale-110"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <SliderRow
                label="字号"
                value={params.fontSize}
                onChange={(v) => patch('fontSize', v)}
                min={10}
                max={120}
                suffix=" px"
              />
              <SliderRow
                label="透明度"
                value={params.opacity}
                onChange={(v) => patch('opacity', v)}
                min={5}
                max={100}
                suffix="%"
              />
              <SliderRow
                label="旋转角度"
                value={params.rotation}
                onChange={(v) => patch('rotation', v)}
                min={-90}
                max={90}
                suffix="°"
              />
              {!params.single && (
                <SliderRow
                  label="平铺疏密"
                  value={params.spacing}
                  onChange={(v) => patch('spacing', v)}
                  min={1}
                  max={4}
                  step={0.1}
                  suffix="×"
                />
              )}

              <Field label="字体">
                <Select
                  value={params.fontFamily}
                  onValueChange={(v) => patch('fontFamily', v)}
                  options={FONTS}
                  size="sm"
                />
              </Field>

              <SwitchRow
                label="加粗"
                checked={params.bold}
                onCheckedChange={(v) => patch('bold', v)}
              />

              <div className="border-t border-border pt-3.5">
                <span className="text-xs font-medium text-muted-foreground">导出格式</span>
                <SegmentedControl
                  size="sm"
                  full
                  className="mt-2"
                  value={mime}
                  onValueChange={(v) => setMime(v as OutputMime)}
                  options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
                />
              </div>

              <button
                type="button"
                onClick={apply}
                disabled={busy || !params.text}
                className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {busy ? '生成中…' : '生成带水印图片'}
              </button>
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="预览" description="预览为示意图，实际密度以导出结果为准">
              <div className="flex max-h-[26rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt="原图"
                  className="max-h-[26rem] max-w-full object-contain"
                />
              </div>
            </Panel>

            {result ? (
              <Panel
                title="导出结果"
                actions={
                  <DownloadButton
                    data={result.blob}
                    filename={renameWithExt(image.name, guessExtension(mime))}
                    sourceLabel="带水印的图片"
                  >
                    下载
                  </DownloadButton>
                }
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-40 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.dataUrl}
                      alt="水印结果"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <StatGrid
                      columns={2}
                      items={[
                        {
                          label: '输出尺寸',
                          value: `${result.width}×${result.height}`,
                          tone: 'primary',
                        },
                        { label: '文件大小', value: formatBytes(result.size) },
                      ]}
                    />
                  </div>
                </div>
              </Panel>
            ) : (
              <EmptyState
                icon={<Stamp />}
                title="等待生成"
                description="设置好水印文字与样式后导出"
              />
            )}
          </div>
        </div>
      )}
    </ToolView>
  );
}
