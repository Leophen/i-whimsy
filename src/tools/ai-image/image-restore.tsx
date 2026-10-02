'use client';

import * as React from 'react';
import { Eraser, ImageIcon, Paintbrush, Sparkles, ZoomIn } from 'lucide-react';

import { BusyOverlay, DownloadButton, ResetButton, StatGrid } from '@/components/tool/bits';
import { CompareSlider } from '@/components/tool/compare-slider';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import {
  SegmentedControl,
  SliderRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/controls';
import { loadImageFromSrc } from '@/lib/core/image';
import {
  RESTORE_MODELS,
  imageDataToBlob,
  imageDataToObjectUrl,
  type RestoreMode,
} from '@/lib/core/image-restore';
import {
  getRestoreModelLabel,
  runColorize,
  runInpaint,
  runUpscale,
  type RestoreProgress,
} from '@/lib/core/image-restore-worker';
import { useAsyncComputed, useHydrated } from '@/lib/hooks';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * 笔刷 mask 画布
 * ------------------------------------------------------------------ */

function MaskEditor({
  imageUrl,
  imageRef,
  brushSize,
  erasing,
  maskVersion,
  onStroke,
}: {
  imageUrl: string;
  imageRef: React.RefObject<HTMLImageElement | null>;
  brushSize: number;
  erasing: boolean;
  maskVersion: number;
  onStroke: (mask: Uint8ClampedArray, width: number, height: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const overlayRef = React.useRef<HTMLCanvasElement>(null);
  const maskRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);

  const paint = React.useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      const overlay = overlayRef.current;
      const maskCanvas = maskRef.current;
      const img = imageRef.current;
      if (!container || !overlay || !maskCanvas || !img) return;

      const rect = container.getBoundingClientRect();
      const scaleX = img.naturalWidth / rect.width;
      const scaleY = img.naturalHeight / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      const maskCtx = maskCanvas.getContext('2d');
      const overlayCtx = overlay.getContext('2d');
      if (!maskCtx || !overlayCtx) return;

      maskCtx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
      overlayCtx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';

      const radius = brushSize * scaleX;
      maskCtx.fillStyle = 'rgba(255,255,255,1)';
      overlayCtx.fillStyle = 'rgba(255,60,60,0.45)';

      maskCtx.beginPath();
      maskCtx.arc(x, y, radius, 0, Math.PI * 2);
      maskCtx.fill();

      overlayCtx.beginPath();
      overlayCtx.arc(x, y, radius, 0, Math.PI * 2);
      overlayCtx.fill();

      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      onStroke(maskData.data, maskCanvas.width, maskCanvas.height);
    },
    [brushSize, erasing, imageRef, onStroke],
  );

  React.useEffect(() => {
    const img = imageRef.current;
    const overlay = overlayRef.current;
    const maskCanvas = maskRef.current;
    if (!img || !overlay || !maskCanvas) return;

    const setup = () => {
      overlay.width = img.naturalWidth;
      overlay.height = img.naturalHeight;
      maskCanvas.width = img.naturalWidth;
      maskCanvas.height = img.naturalHeight;
      const mctx = maskCanvas.getContext('2d');
      const octx = overlay.getContext('2d');
      mctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      octx?.clearRect(0, 0, overlay.width, overlay.height);
    };

    if (img.complete) setup();
    else img.onload = setup;
  }, [imageRef, imageUrl, maskVersion]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="编辑"
        className="block w-full object-contain"
        draggable={false}
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 size-full"
        style={{ width: '100%', height: '100%' }}
      />
      <canvas
        ref={maskRef}
        className="absolute inset-0 size-full cursor-crosshair touch-none"
        style={{ width: '100%', height: '100%' }}
        onPointerDown={(e) => {
          drawing.current = true;
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          paint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          paint(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 主组件
 * ------------------------------------------------------------------ */

type TabMode = RestoreMode;

const INPAINT_SCENES = [
  { id: 'object', name: '去物体', brush: 32 },
  { id: 'watermark', name: '去水印', brush: 16 },
  { id: 'scratch', name: '划痕修复', brush: 12 },
];

const UPSCALE_SCENES = [
  { id: 'social2x', name: '社交 2×', scale: '2' as const },
  { id: 'print4x', name: '打印 4×', scale: '4' as const },
];

const COLORIZE_SCENES = [
  { id: 'portrait', name: '人像上色' },
  { id: 'landscape', name: '风景上色' },
  { id: 'vintage', name: '老照片' },
];

export default function ImageRestore() {
  const tool = useToolMeta('image-restore');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const [tab, setTab] = React.useState<TabMode>('inpaint');
  const [activeSceneId, setActiveSceneId] = React.useState('object');
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; size: number; url: string } | null>(
    null,
  );
  const [batchFiles, setBatchFiles] = React.useState<File[]>([]);

  const [brushSize, setBrushSize] = React.useState(24);
  const [erasing, setErasing] = React.useState(false);
  const [maskVersion, setMaskVersion] = React.useState(0);
  const [mask, setMask] = React.useState<Uint8ClampedArray | null>(null);
  const [maskReady, setMaskReady] = React.useState(false);

  const [upscaleScale, setUpscaleScale] = React.useState<'2' | '4'>('2');
  const [progress, setProgress] = React.useState<RestoreProgress | null>(null);
  const [deviceLabel, setDeviceLabel] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [resultBlob, setResultBlob] = React.useState<Blob | null>(null);
  const [jpgBlob, setJpgBlob] = React.useState<Blob | null>(null);

  const handleFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    imgRef.current = img;
    setFile(f);
    setPreview({ name: f.name, size: f.size, url });
    setMask(null);
    setMaskReady(false);
    setMaskVersion((v) => v + 1);
    setResultUrl(null);
    setResultBlob(null);
    setJpgBlob(null);
    setDeviceLabel(null);
  };

  const handleBatch = (files: File[]) => {
    setBatchFiles(files);
    if (files[0]) void handleFile(files[0]);
  };

  const inpaintJob = useAsyncComputed(
    async () => {
      const img = imgRef.current;
      if (!img || !mask || !maskReady) return null;
      setProgress({ percent: 0, status: '准备修复…' });
      const result = await runInpaint(img, mask, setProgress);
      setProgress(null);
      setDeviceLabel(result.device === 'webgpu' ? 'WebGPU' : 'WASM');
      const url = await imageDataToObjectUrl(result.data);
      const blob = await imageDataToBlob(result.data, 'image/png');
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResultBlob(blob);
      setJpgBlob(null);
      return result;
    },
    [file, mask, maskReady, tab],
    { enabled: Boolean(file && tab === 'inpaint' && maskReady), delay: 400 },
  );

  const upscaleJob = useAsyncComputed(
    async () => {
      const img = imgRef.current;
      if (!img) return null;
      const scale = Number(upscaleScale) as 2 | 4;

      if (batchFiles.length > 1) {
        let lastResult: ImageData | null = null;
        for (let i = 0; i < batchFiles.length; i++) {
          const bf = batchFiles[i]!;
          setProgress({
            percent: Math.round((i / batchFiles.length) * 100),
            status: `放大第 ${i + 1}/${batchFiles.length} 张：${bf.name}`,
          });
          const url = URL.createObjectURL(bf);
          const batchImg = await loadImageFromSrc(url);
          URL.revokeObjectURL(url);
          const r = await runUpscale(batchImg, scale, setProgress);
          lastResult = r.data;
          setDeviceLabel(r.device === 'webgpu' ? 'WebGPU' : 'WASM');
        }
        if (!lastResult) return null;
        setProgress(null);
        const url = await imageDataToObjectUrl(lastResult);
        const blob = await imageDataToBlob(lastResult, 'image/png');
        const jpg = await imageDataToBlob(lastResult, 'image/jpeg');
        setResultUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setResultBlob(blob);
        setJpgBlob(jpg);
        return { data: lastResult };
      }

      setProgress({ percent: 0, status: '准备放大…' });
      const result = await runUpscale(img, scale, setProgress);
      setProgress(null);
      setDeviceLabel(result.device === 'webgpu' ? 'WebGPU' : 'WASM');
      const url = await imageDataToObjectUrl(result.data);
      const blob = await imageDataToBlob(result.data, 'image/png');
      const jpg = await imageDataToBlob(result.data, 'image/jpeg');
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResultBlob(blob);
      setJpgBlob(jpg);
      return result;
    },
    [file, upscaleScale, tab, batchFiles],
    { enabled: Boolean(file && tab === 'upscale'), delay: 300 },
  );

  const colorizeJob = useAsyncComputed(
    async () => {
      const img = imgRef.current;
      if (!img) return null;
      setProgress({ percent: 0, status: '准备上色…' });
      const result = await runColorize(img, setProgress);
      setProgress(null);
      setDeviceLabel(result.device === 'webgpu' ? 'WebGPU' : 'WASM');
      const url = await imageDataToObjectUrl(result.data);
      const blob = await imageDataToBlob(result.data, 'image/png');
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResultBlob(blob);
      setJpgBlob(null);
      return result;
    },
    [file, tab],
    { enabled: Boolean(file && tab === 'colorize'), delay: 300 },
  );

  const activeJob =
    tab === 'inpaint' ? inpaintJob : tab === 'upscale' ? upscaleJob : colorizeJob;

  const triggerInpaint = () => {
    if (!mask) return;
    let painted = false;
    for (let i = 0; i < mask.length; i += 4) {
      if (mask[i]! > 20) {
        painted = true;
        break;
      }
    }
    setMaskReady(painted);
  };

  React.useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const busyLabel = progress
    ? `${progress.status}${progress.percent > 0 ? ` ${progress.percent}%` : ''}`.trim()
    : activeJob.pending
      ? '处理中…'
      : '加载模型…';

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <DownloadButton
            data={resultBlob}
            filename={preview ? `${preview.name.replace(/\.\w+$/, '')}-restore.png` : 'restore.png'}
            disabled={!resultBlob}
          >
            导出 PNG
          </DownloadButton>
          {tab === 'upscale' && (
            <DownloadButton
              data={jpgBlob}
              filename={preview ? `${preview.name.replace(/\.\w+$/, '')}-restore.jpg` : 'restore.jpg'}
              disabled={!jpgBlob}
              variant="secondary"
            >
              导出 JPG
            </DownloadButton>
          )}
        </>
      }
    >
      {!hydrated && <Notice tone="info">正在检测浏览器推理能力…</Notice>}

      <Notice tone="info">
        全部在本地完成，原始照片不上传。切换标签才会下载对应模型（已缓存的不重复下载）。
      </Notice>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = v as TabMode;
          setTab(next);
          setActiveSceneId(
            next === 'inpaint' ? 'object' : next === 'upscale' ? 'social2x' : 'portrait',
          );
        }}
      >
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="inpaint" className="gap-1.5 text-xs sm:text-sm">
            <Paintbrush className="size-3.5 shrink-0" />
            {getRestoreModelLabel('inpaint')}
          </TabsTrigger>
          <TabsTrigger value="upscale" className="gap-1.5 text-xs sm:text-sm">
            <ZoomIn className="size-3.5 shrink-0" />
            {getRestoreModelLabel('upscale')}
          </TabsTrigger>
          <TabsTrigger value="colorize" className="gap-1.5 text-xs sm:text-sm">
            <Sparkles className="size-3.5 shrink-0" />
            {getRestoreModelLabel('colorize')}
          </TabsTrigger>
        </TabsList>

        <ToolIO
          split="wide-output"
          input={
            <div className="flex flex-col gap-4">
              <Panel title="源图" description="拖拽或点击上传，三个标签共用">
                <FileDropzone
                  onFile={(f) => void handleFile(f)}
                  current={preview ? { name: preview.name, size: preview.size, url: preview.url } : null}
                  onRemove={() => {
                    setFile(null);
                    setPreview(null);
                    setBatchFiles([]);
                    setMask(null);
                    imgRef.current = null;
                  }}
                  hint="支持 JPG / PNG / WebP"
                />
              </Panel>

              <TabsContent value="inpaint" className="mt-0">
                {preview && (
                  <Panel title="涂抹要去除的区域" description="红色半透明区域将被 AI 补全">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {INPAINT_SCENES.map((scene) => (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => {
                              setActiveSceneId(scene.id);
                              setBrushSize(scene.brush);
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
                      <MaskEditor
                        imageUrl={preview.url}
                        imageRef={imgRef}
                        brushSize={brushSize}
                        erasing={erasing}
                        maskVersion={maskVersion}
                        onStroke={(data) => {
                          setMask(new Uint8ClampedArray(data));
                          setMaskReady(false);
                        }}
                      />
                      <SliderRow
                        label="笔刷大小"
                        value={brushSize}
                        onChange={setBrushSize}
                        min={4}
                        max={80}
                        step={1}
                        suffix="px"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setErasing(false)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm',
                            !erasing
                              ? 'border-primary bg-primary-subtle/40 text-foreground'
                              : 'border-border text-muted-foreground hover:border-border-strong',
                          )}
                        >
                          <Paintbrush className="size-4" />
                          笔刷
                        </button>
                        <button
                          type="button"
                          onClick={() => setErasing(true)}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm',
                            erasing
                              ? 'border-primary bg-primary-subtle/40 text-foreground'
                              : 'border-border text-muted-foreground hover:border-border-strong',
                          )}
                        >
                          <Eraser className="size-4" />
                          橡皮
                        </button>
                        <ResetButton
                          onReset={() => {
                            setMask(null);
                            setMaskReady(false);
                            setMaskVersion((v) => v + 1);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={triggerInpaint}
                        disabled={!mask}
                        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
                      >
                        开始修复
                      </button>
                      <p className="text-xs text-muted-foreground">
                        模型：{RESTORE_MODELS.inpaint.id} · 固定 512×512 裁切推理，边缘自动羽化融合
                      </p>
                    </div>
                  </Panel>
                )}
              </TabsContent>

              <TabsContent value="upscale" className="mt-0">
                {preview && (
                  <Panel title="放大设置">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap gap-2">
                        {UPSCALE_SCENES.map((scene) => (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => {
                              setActiveSceneId(scene.id);
                              setUpscaleScale(scene.scale);
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
                      <SegmentedControl
                        value={upscaleScale}
                        onValueChange={(v) => setUpscaleScale(v as '2' | '4')}
                        options={[
                          { value: '2', label: '2×（推荐）' },
                          { value: '4', label: '4×' },
                        ]}
                        full
                      />
                      {upscaleScale === '4' && (
                        <Notice tone="warning">
                          4× 放大会占用大量内存（4MP 图约 250MB），长边超过 2048px 会自动缩小输入。
                        </Notice>
                      )}
                      <FileDropzone
                        onFile={(f) => handleBatch([...(batchFiles.length ? batchFiles : file ? [file] : []), f])}
                        accept="image/*"
                        hint="可继续添加图片，将串行排队放大（避免内存峰值）"
                      />
                      {batchFiles.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                          队列：{batchFiles.length} 张，预览最后一张结果
                        </p>
                      )}
                    </div>
                  </Panel>
                )}
              </TabsContent>

              <TabsContent value="colorize" className="mt-0">
                {preview && (
                  <Panel title="老照片上色" description="适合黑白或低饱和照片">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {COLORIZE_SCENES.map((scene) => (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => setActiveSceneId(scene.id)}
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
                    <p className="text-xs text-muted-foreground">
                      模型：DDColor 社区 ONNX · 保留原图 L 通道，仅预测 ab 色度 · 切换到此标签才开始下载
                    </p>
                  </Panel>
                )}
              </TabsContent>
            </div>
          }
          output={
            <Panel title="结果" className="relative min-h-[320px]">
              {!file && (
                <EmptyState
                  icon={<ImageIcon className="size-6 text-muted-foreground" />}
                  title="上传图片开始修复"
                  description="去物体、超分辨率放大、黑白上色 —— 全部本地 ONNX 推理"
                />
              )}

              {file && activeJob.error && <Notice tone="danger">{activeJob.error}</Notice>}

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

              {file && <BusyOverlay show={Boolean(activeJob.pending && !progress)} label={busyLabel} />}

              {file && preview && resultUrl ? (
                <div className="flex flex-col gap-4">
                  <CompareSlider beforeUrl={preview.url} afterUrl={resultUrl} />
                  <StatGrid
                    columns={3}
                    items={[
                      { label: '推理后端', value: deviceLabel ?? '—' },
                      {
                        label: '当前模式',
                        value:
                          tab === 'inpaint' ? '去物体' : tab === 'upscale' ? `${upscaleScale}× 放大` : '上色',
                      },
                      {
                        label: '模型',
                        value: RESTORE_MODELS[tab].sizeLabel,
                      },
                    ]}
                  />
                </div>
              ) : file && tab === 'inpaint' && !maskReady ? (
                <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-surface-2/40 text-sm text-muted-foreground">
                  涂抹要去除的区域，然后点击「开始修复」
                </div>
              ) : file && tab !== 'inpaint' && !activeJob.pending && !activeJob.error ? (
                <div className="grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-border bg-surface-2/40 text-sm text-muted-foreground">
                  切换到此标签后正在加载模型…
                </div>
              ) : null}
            </Panel>
          }
        />
      </Tabs>
    </ToolView>
  );
}
