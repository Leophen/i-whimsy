'use client';

import * as React from 'react';
import { Minimize2 } from 'lucide-react';

import { DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { readImageFile, FileDropzone, type LoadedImageMeta } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { Badge } from '@/components/ui/card';
import { compressImage, loadImageFromSrc, type OutputMime } from '@/lib/core/image';
import { guessExtension, renameWithExt } from '@/lib/core/browser';
import { fitDimension } from '@/lib/core/image';
import { useAsyncComputed } from '@/lib/hooks';
import { formatBytes } from '@/lib/utils';

const FORMATS: { value: OutputMime; label: string }[] = [
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
];

export default function ImageCompress() {
  const tool = useToolMeta('image-compress');
  useTrackRecent(tool.slug);

  const [image, setImage] = React.useState<LoadedImageMeta | null>(null);
  const [quality, setQuality] = React.useState(0.8);
  const [maxDimension, setMaxDimension] = React.useState(1920);
  const [mime, setMime] = React.useState<OutputMime>('image/webp');
  const [readError, setReadError] = React.useState<string | null>(null);
  const [reading, setReading] = React.useState(false);

  const handleFile = async (file: File) => {
    setReadError(null);
    setReading(true);
    try {
      setImage(await readImageFile(file));
    } catch {
      setReadError('无法读取这张图片，换一个文件试试');
    } finally {
      setReading(false);
    }
  };

  // 压缩流程：读图 → 缩放重编码，防抖 150ms 避免拖滑杆时反复重算
  const compressed = useAsyncComputed(
    async () => {
      const img = await loadImageFromSrc(image!.url);
      return compressImage(img, { quality, mime, maxDimension });
    },
    [image, quality, mime, maxDimension],
    { delay: 150, enabled: Boolean(image) },
  );

  const result = compressed.value;
  const busy = reading || compressed.pending;
  const error = readError ?? (compressed.error ? '压缩失败，试试调低质量或换种格式' : null);

  const saved = image && result ? image.size - result.size : 0;
  const savedPercent = image && result && image.size > 0 ? (saved / image.size) * 100 : 0;
  const target = image
    ? fitDimension(image.width, image.height, maxDimension)
    : { width: 0, height: 0 };

  return (
    <ToolView tool={tool}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <Panel title="上传与参数">
          <FileDropzone
            accept="image/*"
            onFile={handleFile}
            current={image ? { name: image.name, size: image.size, url: image.url } : null}
            onRemove={() => setImage(null)}
          />

          {image && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <SliderRow
                label="输出质量"
                value={Math.round(quality * 100)}
                onChange={(v) => setQuality(v / 100)}
                min={10}
                max={100}
                suffix="%"
              />
              <SliderRow
                label="最大边长"
                value={maxDimension}
                onChange={setMaxDimension}
                min={320}
                max={4096}
                step={32}
                suffix=" px"
              />
              <div>
                <span className="text-xs font-medium text-muted-foreground">输出格式</span>
                <SegmentedControl
                  size="sm"
                  full
                  className="mt-2"
                  value={mime}
                  onValueChange={(v) => setMime(v as OutputMime)}
                  options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {mime === 'image/webp'
                    ? 'WebP 体积最小，现代浏览器全支持'
                    : mime === 'image/jpeg'
                      ? 'JPEG 兼容性最好，不支持透明通道'
                      : 'PNG 无损，适合含透明或线条锐利的图'}
                </p>
              </div>
              <p className="text-xs text-subtle-foreground">
                输出尺寸：{target.width} × {target.height}
              </p>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          {!image ? (
            <EmptyState
              icon={<Minimize2 />}
              title="还没有图片"
              description="选择一张图片，实时对比压缩前后的体积"
            />
          ) : (
            <>
              <Panel
                title="压缩前后"
                description={busy ? '处理中…' : '左侧原图，右侧压缩结果'}
                actions={
                  <DownloadButton
                    data={result?.blob ?? null}
                    filename={renameWithExt(image.name, guessExtension(mime))}
                    sourceLabel="压缩后的图片"
                    disabled={busy || !result}
                  >
                    下载
                  </DownloadButton>
                }
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <figure className="overflow-hidden rounded-xl border border-border">
                    <div className="flex h-48 items-center justify-center bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt="原图"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <figcaption className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                      <span className="text-muted-foreground">原图</span>
                      <span className="tabular font-medium">{formatBytes(image.size)}</span>
                    </figcaption>
                  </figure>

                  <figure className="overflow-hidden rounded-xl border border-primary/30">
                    <div className="flex h-48 items-center justify-center bg-surface-2">
                      {result ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.dataUrl}
                          alt="压缩结果"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {busy ? '压缩中…' : '—'}
                        </span>
                      )}
                    </div>
                    <figcaption className="flex items-center justify-between border-t border-border px-3 py-2 text-xs">
                      <span className="text-muted-foreground">
                        压缩后 {result ? `${result.width}×${result.height}` : ''}
                      </span>
                      <span className="tabular font-medium text-primary">
                        {result ? formatBytes(result.size) : '—'}
                      </span>
                    </figcaption>
                  </figure>
                </div>

                {result && (
                  <div className="mt-3">
                    <StatGrid
                      columns={3}
                      items={[
                        {
                          label: '节省体积',
                          value: formatBytes(Math.max(saved, 0)),
                          tone: 'success',
                        },
                        {
                          label: '压缩比',
                          value: `${savedPercent.toFixed(1)}%`,
                          tone: savedPercent > 0 ? 'success' : 'warning',
                        },
                        {
                          label: '压缩后占比',
                          value: `${(100 - savedPercent).toFixed(1)}%`,
                        },
                      ]}
                    />
                    {saved <= 0 && (
                      <Notice tone="warning" className="mt-3">
                        压缩后反而更大了 —— 试试调低质量、换成 WebP，或这张图本身已经是压缩过的
                        JPEG。
                      </Notice>
                    )}
                  </div>
                )}
                {error && (
                  <Notice tone="danger" className="mt-3">
                    {error}
                  </Notice>
                )}
              </Panel>

              <Notice tone="info">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="neutral" size="sm">
                    本地处理
                  </Badge>
                  图片通过 Canvas 在你自己的浏览器里重新编码，全程没有一次网络请求。
                </div>
              </Notice>
            </>
          )}
        </div>
      </div>
    </ToolView>
  );
}
