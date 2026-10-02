'use client';

import * as React from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Crop } from 'lucide-react';

import { DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone, readImageFile, type LoadedImageMeta } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { cropImageToBlob, type CompressResult, type OutputMime } from '@/lib/core/image';
import { guessExtension, renameWithExt } from '@/lib/core/browser';
import { loadImageFromSrc } from '@/lib/core/image';
import { formatBytes } from '@/lib/utils';

const RATIOS = [
  { value: 'free', label: '自由', ratio: 0 },
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '4:3', label: '4:3', ratio: 4 / 3 },
  { value: '3:4', label: '3:4', ratio: 3 / 4 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
];

const FORMATS: { value: OutputMime; label: string }[] = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
];

export default function ImageCrop() {
  const tool = useToolMeta('image-crop');
  useTrackRecent(tool.slug);

  const [image, setImage] = React.useState<LoadedImageMeta | null>(null);
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [ratio, setRatio] = React.useState('free');
  const [round, setRound] = React.useState(false);
  const [mime, setMime] = React.useState<OutputMime>('image/png');
  const [area, setArea] = React.useState<Area | null>(null);
  const [result, setResult] = React.useState<CompressResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  const aspect = RATIOS.find((r) => r.value === ratio)?.ratio ?? 0;

  const handleFile = async (file: File) => {
    setResult(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    const meta = await readImageFile(file);
    setImage(meta);
  };

  const doCrop = async () => {
    if (!image || !area) return;
    setBusy(true);
    try {
      const img = await loadImageFromSrc(image.url);
      const r = await cropImageToBlob(
        img,
        { x: area.x, y: area.y, width: area.width, height: area.height },
        mime,
        0.92,
      );
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
          <Panel title="裁剪设置">
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
              <div>
                <span className="text-xs font-medium text-muted-foreground">裁剪比例</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {RATIOS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRatio(r.value)}
                      className={
                        ratio === r.value
                          ? 'rounded-lg border border-primary bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary'
                          : 'rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground'
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <SliderRow label="缩放" value={zoom} onChange={setZoom} min={1} max={4} step={0.01} />

              <SwitchRow
                label="圆形蒙版"
                description="导出头像常用的圆形裁剪框"
                checked={round}
                onCheckedChange={setRound}
              />

              <div>
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
                onClick={doCrop}
                disabled={busy || !area}
                className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {busy ? '裁剪中…' : '裁剪并生成'}
              </button>
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="裁剪预览" description="拖动图片调整位置，滚轮或滑杆缩放">
              <div className="relative h-[22rem] overflow-hidden rounded-xl border border-border bg-surface-2">
                <Cropper
                  image={image.url}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect || undefined}
                  cropShape={round ? 'round' : 'rect'}
                  showGrid={!round}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setArea(pixels)}
                  restrictPosition
                />
              </div>
            </Panel>

            {result ? (
              <Panel
                title="裁剪结果"
                actions={
                  <DownloadButton
                    data={result.blob}
                    filename={renameWithExt(image.name, guessExtension(mime))}
                    sourceLabel="裁剪后的图片"
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
                      alt="裁剪结果"
                      className={`max-h-full max-w-full object-contain ${round ? 'rounded-full' : ''}`}
                    />
                  </div>
                  <div className="flex-1">
                    <StatGrid
                      columns={2}
                      items={[
                        {
                          label: '输出尺寸',
                          value: `${area?.width ?? 0}×${area?.height ?? 0}`,
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
                icon={<Crop />}
                title="等待裁剪"
                description="调整好区域后点「裁剪并生成」"
              />
            )}
          </div>
        </div>
      )}
    </ToolView>
  );
}
