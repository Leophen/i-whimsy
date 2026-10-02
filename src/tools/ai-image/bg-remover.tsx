'use client';

import * as React from 'react';
import { ChevronDown, ImageIcon } from 'lucide-react';

import { BusyOverlay, DownloadButton, ResetButton, StatGrid } from '@/components/tool/bits';
import { CompareSlider } from '@/components/tool/compare-slider';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { removeBackgroundFromImage } from '@/lib/core/bg-remover-worker';
import { loadImageFromSrc } from '@/lib/core/image';
import {
  DEFAULT_MATTING_OPTIONS,
  GRADIENT_PRESETS,
  extractScaledPixels,
  renderMattingCanvas,
  type BackgroundMode,
  type GradientBackground,
} from '@/lib/core/matting';
import { useAsyncComputed, useHydrated } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const MATTING_SCENES = [
  { id: 'ecommerce', name: '电商白底', mode: 'solid' as BackgroundMode, solid: '#ffffff' },
  { id: 'passport', name: '证件灰底', mode: 'solid' as BackgroundMode, solid: '#f5f5f5' },
  {
    id: 'studio',
    name: '影棚渐变',
    mode: 'gradient' as BackgroundMode,
    gradient: GRADIENT_PRESETS[0]!.gradient,
  },
  { id: 'transparent', name: '透明 PNG', mode: 'transparent' as BackgroundMode },
];

const BG_MODE_OPTIONS = [
  { value: 'transparent', label: '透明' },
  { value: 'solid', label: '纯色' },
  { value: 'gradient', label: '渐变' },
  { value: 'image', label: '图片' },
];

export default function BgRemover() {
  const tool = useToolMeta('bg-remover');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; size: number; url: string } | null>(
    null,
  );
  const [progress, setProgress] = React.useState<{ percent: number; status: string } | null>(null);
  const fileTokenRef = React.useRef(0);
  const [activeSceneId, setActiveSceneId] = React.useState('transparent');

  const [backgroundMode, setBackgroundMode] = React.useState<BackgroundMode>('transparent');
  const [solidColor, setSolidColor] = React.useState(DEFAULT_MATTING_OPTIONS.solidColor);
  const [gradient, setGradient] = React.useState<GradientBackground>(DEFAULT_MATTING_OPTIONS.gradient);
  const [feather, setFeather] = React.useState(0);
  const [shrink, setShrink] = React.useState(0);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [bgFile, setBgFile] = React.useState<File | null>(null);
  const [bgPreview, setBgPreview] = React.useState<string | null>(null);
  const [bgImage, setBgImage] = React.useState<HTMLImageElement | null>(null);

  const handleFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    imgRef.current = img;
    setFile(f);
    fileTokenRef.current += 1;
    setProgress(null);
    setPreview({ name: f.name, size: f.size, url });
  };

  const handleBgFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    setBgImage(img);
    setBgFile(f);
    setBgPreview(url);
    setBackgroundMode('image');
  };

  const mattingJob = useAsyncComputed(
    async () => {
      const token = fileTokenRef.current;
      const img = imgRef.current;
      if (!img) return null;
      const result = await removeBackgroundFromImage(img, (p) => {
        if (fileTokenRef.current === token) setProgress(p);
      });
      if (fileTokenRef.current !== token) return null;
      setProgress(null);
      const pixels = extractScaledPixels(img, result.width, result.height);
      return {
        maskResult: result,
        sourcePixels: pixels,
        deviceLabel: result.device === 'webgpu' ? 'WebGPU' : 'WASM',
        inferenceMs: result.elapsedMs,
      };
    },
    [file],
    { enabled: Boolean(file) },
  );

  const maskResult = mattingJob.value?.maskResult ?? null;
  const sourcePixels = mattingJob.value?.sourcePixels ?? null;
  const deviceLabel = mattingJob.value?.deviceLabel ?? null;
  const inferenceMs = mattingJob.value?.inferenceMs ?? null;
  const ready = Boolean(maskResult && sourcePixels && !mattingJob.pending && !mattingJob.error);

  const renderOptions = React.useMemo(
    () => ({
      feather,
      shrink,
      backgroundMode,
      solidColor,
      gradient,
      paintBackground: backgroundMode !== 'transparent',
    }),
    [backgroundMode, feather, gradient, shrink, solidColor],
  );

  const resultCanvas = React.useMemo(() => {
    if (!ready || !maskResult || !sourcePixels) return null;
    return renderMattingCanvas(
      sourcePixels,
      maskResult.mask,
      renderOptions,
      backgroundMode === 'image' ? bgImage : null,
    );
  }, [backgroundMode, bgImage, maskResult, ready, renderOptions, sourcePixels]);

  const transparentCanvas = React.useMemo(() => {
    if (!ready || !maskResult || !sourcePixels) return null;
    return renderMattingCanvas(sourcePixels, maskResult.mask, {
      ...renderOptions,
      backgroundMode: 'transparent',
      paintBackground: false,
    }, null);
  }, [maskResult, ready, renderOptions, sourcePixels]);

  const resultUrl = React.useMemo(() => {
    if (!resultCanvas) return null;
    return resultCanvas.toDataURL('image/png');
  }, [resultCanvas]);

  const exportPngBlob = React.useMemo(() => {
    if (!transparentCanvas) return null;
    const dataUrl = transparentCanvas.toDataURL('image/png');
    const [header, base64] = dataUrl.split(',');
    const mime = header?.match(/:(.*?);/)?.[1] ?? 'image/png';
    const binary = atob(base64 ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }, [transparentCanvas]);

  const exportJpgBlob = React.useMemo(() => {
    if (!transparentCanvas) return null;
    const canvas = document.createElement('canvas');
    canvas.width = transparentCanvas.width;
    canvas.height = transparentCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(transparentCanvas, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const [header, base64] = dataUrl.split(',');
    const mime = header?.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    const binary = atob(base64 ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }, [transparentCanvas]);

  const resetAdjustments = () => {
    setFeather(0);
    setShrink(0);
    setBackgroundMode('transparent');
    setSolidColor(DEFAULT_MATTING_OPTIONS.solidColor);
    setGradient(DEFAULT_MATTING_OPTIONS.gradient);
    setBgFile(null);
    setBgPreview(null);
    setBgImage(null);
  };

  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const blob = item?.getAsFile();
      if (blob) void handleFile(blob);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  const busyLabel = progress
    ? `${progress.status} ${progress.percent > 0 ? `${progress.percent}%` : ''}`.trim()
    : mattingJob.pending
      ? '正在抠图…'
      : '处理中…';

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <DownloadButton
            data={exportPngBlob}
            filename={preview ? `${preview.name.replace(/\.\w+$/, '')}-cutout.png` : 'cutout.png'}
            disabled={!exportPngBlob}
          >
            PNG 透明底
          </DownloadButton>
          <DownloadButton
            data={exportJpgBlob}
            filename={preview ? `${preview.name.replace(/\.\w+$/, '')}-white.jpg` : 'cutout-white.jpg'}
            disabled={!exportJpgBlob}
            variant="secondary"
          >
            白底 JPG
          </DownloadButton>
        </>
      }
    >
      {!hydrated && (
        <Notice tone="info">正在检测浏览器推理能力…</Notice>
      )}

      <ToolIO
        split="wide-output"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="输入图片" description="拖拽、点击或 Ctrl+V 粘贴，文件不会上传">
              <FileDropzone
                onFile={(f) => void handleFile(f)}
                current={preview ? { name: preview.name, size: preview.size, url: preview.url } : null}
                onRemove={() => {
                  fileTokenRef.current += 1;
                  setProgress(null);
                  setFile(null);
                  setPreview(null);
                  imgRef.current = null;
                }}
                hint="人像或商品图 · 首次处理需下载约 25MB 模型"
              />
            </Panel>

            {file && (
              <Panel title="边缘与背景">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {MATTING_SCENES.map((scene) => (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => {
                          setActiveSceneId(scene.id);
                          setBackgroundMode(scene.mode);
                          if (scene.solid) setSolidColor(scene.solid);
                          if (scene.gradient) setGradient(scene.gradient);
                        }}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                          activeSceneId === scene.id
                            ? 'border-primary bg-primary-subtle/40 text-foreground'
                            : 'border-border hover:border-primary/40 hover:bg-primary-subtle/30',
                        )}
                      >
                        {scene.name}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">背景模式</span>
                    <SegmentedControl
                      value={backgroundMode}
                      onValueChange={(v) => setBackgroundMode(v as BackgroundMode)}
                      options={BG_MODE_OPTIONS}
                      full
                    />
                  </div>

                  {backgroundMode === 'solid' && (
                    <label className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">颜色</span>
                      <input
                        type="color"
                        value={solidColor}
                        onChange={(e) => setSolidColor(e.target.value)}
                        className="size-9 cursor-pointer rounded-lg border border-border bg-transparent"
                      />
                      <span className="font-mono text-xs text-subtle-foreground">{solidColor}</span>
                    </label>
                  )}

                  {backgroundMode === 'gradient' && (
                    <div className="grid grid-cols-3 gap-2">
                      {GRADIENT_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setGradient(preset.gradient)}
                          className={cn(
                            'rounded-lg border p-2 text-left text-xs transition-colors',
                            gradient.from === preset.gradient.from && gradient.to === preset.gradient.to
                              ? 'border-primary bg-primary-subtle/40'
                              : 'border-border hover:border-border-strong',
                          )}
                        >
                          <div
                            className="mb-1.5 h-6 rounded-md"
                            style={{
                              background: `linear-gradient(${preset.gradient.angle}deg, ${preset.gradient.from}, ${preset.gradient.to})`,
                            }}
                          />
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {backgroundMode === 'image' && (
                    <FileDropzone
                      onFile={(f) => void handleBgFile(f)}
                      accept="image/*"
                      current={
                        bgFile
                          ? { name: bgFile.name, size: bgFile.size, url: bgPreview ?? undefined }
                          : null
                      }
                      onRemove={() => {
                        setBgFile(null);
                        setBgPreview(null);
                        setBgImage(null);
                      }}
                      hint="上传自定义背景图"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn('size-3.5 transition-transform', showAdvanced && 'rotate-180')} />
                    边缘微调与模型信息
                  </button>

                  {showAdvanced && (
                    <div className="flex flex-col gap-4">
                      <SliderRow
                        label="羽化边缘"
                        value={feather}
                        onChange={setFeather}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                      />
                      <SliderRow
                        label="收缩边缘"
                        value={shrink}
                        onChange={setShrink}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                      />
                      <div className="rounded-lg border border-border bg-surface-2/50 p-3 text-xs text-muted-foreground">
                        <p>模型：Xenova/modnet（Apache-2.0）</p>
                        <p className="mt-1">
                          推理后端：{deviceLabel ?? '待检测'}
                          {deviceLabel === 'WASM' && ' · iOS 或无 WebGPU 时自动使用'}
                        </p>
                      </div>
                    </div>
                  )}

                  <ResetButton onReset={resetAdjustments} />
                </div>
              </Panel>
            )}
          </div>
        }
        output={
          <Panel title="预览" className="relative min-h-[320px]">
            {!file && (
              <EmptyState
                icon={<ImageIcon className="size-6 text-muted-foreground" />}
                title="上传图片开始抠图"
                description="本地 MODNet 模型分割前景，支持换背景与 PNG 导出"
              />
            )}

            {file && mattingJob.error && (
              <Notice tone="danger">{mattingJob.error}</Notice>
            )}

            {file && progress && (
              <div className="mb-4">
                <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="min-w-0 truncate">{progress.status}</span>
                  <span className="shrink-0 tabular">{progress.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {file && (
              <BusyOverlay show={Boolean(mattingJob.pending && !progress)} label={busyLabel} />
            )}

            {ready && preview && resultUrl ? (
              <div className="flex flex-col gap-4">
                <CompareSlider beforeUrl={preview.url} afterUrl={resultUrl} />
                {maskResult && (
                  <StatGrid
                    columns={3}
                    items={[
                      { label: '推理耗时', value: inferenceMs != null ? `${inferenceMs} ms` : '—' },
                      { label: '后端', value: deviceLabel ?? '—' },
                      {
                        label: '输出尺寸',
                        value: `${maskResult.width} × ${maskResult.height}`,
                      },
                    ]}
                  />
                )}
              </div>
            ) : file && !mattingJob.pending && !mattingJob.error ? (
              <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-surface-2/40 text-sm text-muted-foreground">
                等待模型就绪…
              </div>
            ) : null}
          </Panel>
        }
      />
    </ToolView>
  );
}
