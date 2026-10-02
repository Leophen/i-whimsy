'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';

import { DownloadButton, ResetButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone, readImageFile, type LoadedImageMeta } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import {
  DEFAULT_FILTER_PARAMS,
  FILTER_PRESETS,
  applyFilter,
  buildFilterString,
  isFilterDefault,
  loadImageFromSrc,
  type CompressResult,
  type FilterParams,
  type OutputMime,
} from '@/lib/core/image';
import { guessExtension, renameWithExt } from '@/lib/core/browser';
import { formatBytes } from '@/lib/utils';

const FORMATS: { value: OutputMime; label: string }[] = [
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/webp', label: 'WebP' },
];

export default function ImageFilter() {
  const tool = useToolMeta('image-filter');
  useTrackRecent(tool.slug);

  const [image, setImage] = React.useState<LoadedImageMeta | null>(null);
  const [params, setParams] = React.useState<FilterParams>(DEFAULT_FILTER_PARAMS);
  const [preset, setPreset] = React.useState('原图');
  const [mime, setMime] = React.useState<OutputMime>('image/png');
  const [result, setResult] = React.useState<CompressResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  const patch = <K extends keyof FilterParams>(key: K, value: FilterParams[K]) => {
    setPreset('自定义');
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleFile = async (file: File) => {
    setResult(null);
    const meta = await readImageFile(file);
    setImage(meta);
  };

  const apply = async () => {
    if (!image) return;
    setBusy(true);
    try {
      const img = await loadImageFromSrc(image.url);
      const r = await applyFilter(img, params, mime);
      setResult(r);
    } finally {
      setBusy(false);
    }
  };

  const cssFilter = buildFilterString(params);

  return (
    <ToolView
      tool={tool}
      actions={
        <ResetButton
          onReset={() => {
            setParams(DEFAULT_FILTER_PARAMS);
            setPreset('原图');
            setResult(null);
          }}
        />
      }
    >
      {!image ? (
        <Panel title="选择图片">
          <FileDropzone accept="image/*" onFile={handleFile} />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Panel title="调色参数">
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
                <span className="text-xs font-medium text-muted-foreground">预设</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FILTER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setPreset(p.name);
                        setParams({ ...DEFAULT_FILTER_PARAMS, ...p.params });
                      }}
                      className={
                        preset === p.name
                          ? 'rounded-lg border border-primary bg-primary-subtle px-2.5 py-1 text-xs font-medium text-primary'
                          : 'rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground'
                      }
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3.5 border-t border-border pt-3.5">
                <SliderRow
                  label="亮度"
                  value={params.brightness}
                  onChange={(v) => patch('brightness', v)}
                  min={0}
                  max={200}
                  suffix="%"
                />
                <SliderRow
                  label="对比度"
                  value={params.contrast}
                  onChange={(v) => patch('contrast', v)}
                  min={0}
                  max={200}
                  suffix="%"
                />
                <SliderRow
                  label="饱和度"
                  value={params.saturate}
                  onChange={(v) => patch('saturate', v)}
                  min={0}
                  max={200}
                  suffix="%"
                />
                <SliderRow
                  label="色相旋转"
                  value={params.hueRotate}
                  onChange={(v) => patch('hueRotate', v)}
                  min={-180}
                  max={180}
                  suffix="°"
                />
                <SliderRow
                  label="模糊"
                  value={params.blur}
                  onChange={(v) => patch('blur', v)}
                  min={0}
                  max={20}
                  step={0.1}
                  suffix=" px"
                />
                <SliderRow
                  label="灰度"
                  value={params.grayscale}
                  onChange={(v) => patch('grayscale', v)}
                  min={0}
                  max={100}
                  suffix="%"
                />
                <SliderRow
                  label="怀旧"
                  value={params.sepia}
                  onChange={(v) => patch('sepia', v)}
                  min={0}
                  max={100}
                  suffix="%"
                />
                <SliderRow
                  label="反相"
                  value={params.invert}
                  onChange={(v) => patch('invert', v)}
                  min={0}
                  max={100}
                  suffix="%"
                />
              </div>

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
                disabled={busy}
                className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {busy ? '处理中…' : '应用并导出'}
              </button>
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="实时预览" description="预览使用 CSS filter，与导出结果一致">
              <div className="flex max-h-[28rem] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt="预览"
                  style={{ filter: cssFilter }}
                  className="max-h-[28rem] max-w-full object-contain"
                />
              </div>
              <code className="mt-3 block break-all rounded-xl border border-border bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                filter: {cssFilter};
              </code>
            </Panel>

            {result ? (
              <Panel
                title="导出结果"
                actions={
                  <DownloadButton
                    data={result.blob}
                    filename={renameWithExt(image.name, guessExtension(mime))}
                    sourceLabel="调色后的图片"
                  >
                    下载
                  </DownloadButton>
                }
              >
                <StatGrid
                  columns={3}
                  items={[
                    {
                      label: '输出尺寸',
                      value: `${result.width}×${result.height}`,
                      tone: 'primary',
                    },
                    { label: '文件大小', value: formatBytes(result.size) },
                    { label: '是否改动', value: isFilterDefault(params) ? '原图' : '已调色' },
                  ]}
                />
              </Panel>
            ) : (
              <EmptyState
                icon={<SlidersHorizontal />}
                title="等待导出"
                description="调好参数后点「应用并导出」生成图片"
              />
            )}
          </div>
        </div>
      )}
    </ToolView>
  );
}
