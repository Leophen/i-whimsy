'use client';

import * as React from 'react';
import { Film, ImageIcon, RefreshCw, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';

import { DownloadButton, ProgressOverlay } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import { depthToImageData } from '@/lib/core/depth';
import { disposeDepthWorker, estimateDepthFromImage } from '@/lib/core/depth-worker';
import { loadImageFromSrc } from '@/lib/core/image';
import {
  DEFAULT_PHOTO3D_PARAMS,
  encodeGif,
  grabCanvasFrame,
  pickVideoMimeType,
  Photo3DRenderer,
  recordLoopVideo,
  type Photo3DMode,
  type Photo3DParams,
} from '@/lib/core/photo-3d';
import { useAsyncComputed, useHydrated } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const MODE_OPTIONS = [
  { value: 'wiggle', label: '摇动' },
  { value: 'stereo', label: '左右立体' },
  { value: 'blur', label: '背景虚化' },
];

const PHOTO3D_SCENES = [
  {
    id: 'portrait',
    name: '人像摇动',
    mode: 'wiggle' as Photo3DMode,
    params: { wiggleAmplitude: 0.45, parallaxStrength: 0.55, blurStrength: 0.6 },
  },
  {
    id: 'landscape',
    name: '风景景深',
    mode: 'blur' as Photo3DMode,
    params: { wiggleAmplitude: 0.35, parallaxStrength: 0.5, blurStrength: 0.75 },
  },
  {
    id: 'stereo',
    name: '立体卡片',
    mode: 'stereo' as Photo3DMode,
    params: { wiggleAmplitude: 0.3, parallaxStrength: 0.8, blurStrength: 0.5 },
  },
  {
    id: 'social',
    name: '社交动图',
    mode: 'wiggle' as Photo3DMode,
    params: { wiggleAmplitude: 0.65, parallaxStrength: 0.5, blurStrength: 0.55 },
  },
];

export default function Photo3D() {
  const tool = useToolMeta('photo-3d');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const rendererRef = React.useRef<Photo3DRenderer | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const depthPreviewRef = React.useRef<HTMLCanvasElement>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; size: number; url: string } | null>(
    null,
  );
  const [mode, setMode] = React.useState<Photo3DMode>('wiggle');
  const [params, setParams] = React.useState<Photo3DParams>(DEFAULT_PHOTO3D_PARAMS);
  const [showDepth, setShowDepth] = React.useState(false);
  const [depthProgress, setDepthProgress] = React.useState<{
    percent: number;
    status: string;
  } | null>(null);
  const depthRunRef = React.useRef(0);
  const [depthRunId, setDepthRunId] = React.useState(0);
  const [depthPaused, setDepthPaused] = React.useState(false);
  const [activeSceneId, setActiveSceneId] = React.useState('portrait');
  const [gyroEnabled, setGyroEnabled] = React.useState(false);
  const [videoBlob, setVideoBlob] = React.useState<Blob | null>(null);
  const [gifBlob, setGifBlob] = React.useState<Blob | null>(null);
  const [exporting, setExporting] = React.useState<'video' | 'gif' | null>(null);
  const [exportPct, setExportPct] = React.useState(0);
  const videoExt = pickVideoMimeType().ext;

  const handleFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    imgRef.current = img;
    setFile(f);
    setPreview({ name: f.name, size: f.size, url });
    depthRunRef.current += 1;
    setDepthRunId((id) => id + 1);
    setDepthPaused(false);
    setDepthProgress({ percent: 0, status: '准备深度估计…' });
    setVideoBlob(null);
    setGifBlob(null);
  };

  const retryDepth = () => {
    disposeDepthWorker();
    depthRunRef.current += 1;
    setDepthPaused(false);
    setDepthRunId((id) => id + 1);
    setDepthProgress({ percent: 0, status: '正在重新加载模型…' });
  };

  const cancelDepth = () => {
    disposeDepthWorker();
    depthRunRef.current += 1;
    setDepthPaused(true);
    setDepthProgress(null);
  };

  const depthJob = useAsyncComputed(
    async () => {
      const runId = depthRunRef.current;
      const img = imgRef.current;
      if (!img) return null;
      setDepthProgress((prev) => prev ?? { percent: 0, status: '正在启动深度推理…' });
      const result = await estimateDepthFromImage(img, (p) => {
        if (depthRunRef.current === runId) setDepthProgress(p);
      });
      if (depthRunRef.current !== runId) return null;
      setDepthProgress(null);
      return {
        depth: result.depth,
        deviceLabel: result.device === 'webgpu' ? 'WebGPU' : 'WASM',
      };
    },
    [file, depthRunId],
    { enabled: Boolean(file) && !depthPaused, delay: 0 },
  );

  const depth = depthJob.value?.depth ?? null;
  const deviceLabel = depthJob.value?.deviceLabel ?? null;
  const ready = Boolean(depth && file && !depthJob.pending && !depthJob.error);

  // 深度图灰度预览
  React.useEffect(() => {
    const canvas = depthPreviewRef.current;
    if (!canvas || !depth || !showDepth) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = depth.width;
    canvas.height = depth.height;
    ctx.putImageData(depthToImageData(depth), 0, 0);
  }, [depth, showDepth]);

  // Three.js 渲染器生命周期（params 由下方 effect 单独推送，避免整场景重建）
  React.useEffect(() => {
    if (!ready || !depth || !imgRef.current || !viewportRef.current || showDepth) {
      rendererRef.current?.dispose();
      rendererRef.current = null;
      return;
    }

    const container = viewportRef.current;
    const renderer = new Photo3DRenderer(container, {
      image: imgRef.current,
      depth,
      mode,
      params,
    });
    rendererRef.current = renderer;
    void renderer.init();

    const onResize = () => renderer.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params 由独立 effect 推送
  }, [ready, depth, mode, showDepth]);

  // 参数实时联动
  React.useEffect(() => {
    rendererRef.current?.setParams(params);
  }, [params]);

  const handlePointer = React.useCallback((clientX: number, clientY: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((clientY - rect.top) / rect.height) * 2 - 1;
    rendererRef.current?.setPointer(x, y);
  }, []);

  // 陀螺仪（iOS 需用户手势授权）
  const enableGyro = async () => {
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    try {
      if (typeof DOE.requestPermission === 'function') {
        const perm = await DOE.requestPermission();
        if (perm !== 'granted') {
          toast.error('未获得设备方向权限，已使用鼠标控制');
          return;
        }
      }
      setGyroEnabled(true);
      toast.success('已启用陀螺仪摇动');
    } catch {
      toast.error('无法启用陀螺仪，请使用鼠标控制');
    }
  };

  React.useEffect(() => {
    if (!gyroEnabled || !ready) return;
    const onOrient = (e: DeviceOrientationEvent) => {
      const beta = (e.beta ?? 0) / 45;
      const gamma = (e.gamma ?? 0) / 45;
      rendererRef.current?.setPointer(
        Math.max(-1, Math.min(1, gamma)),
        Math.max(-1, Math.min(1, beta)),
      );
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => window.removeEventListener('deviceorientation', onOrient);
  }, [gyroEnabled, ready]);

  const exportVideo = async () => {
    const canvas = rendererRef.current?.getCanvas();
    if (!canvas) {
      toast.error('请先上传图片并等待深度估计完成');
      return;
    }
    setExporting('video');
    setExportPct(0);
    try {
      const blob = await recordLoopVideo(canvas, 5000, 30, setExportPct);
      setVideoBlob(blob);
      toast.success('循环视频已准备好');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '视频导出失败');
    } finally {
      setExporting(null);
      setExportPct(0);
    }
  };

  const exportGif = async () => {
    const canvas = rendererRef.current?.getCanvas();
    if (!canvas) {
      toast.error('请先上传图片并等待深度估计完成');
      return;
    }
    setExporting('gif');
    setExportPct(0);
    try {
      const frameCount = 24;
      const frames: ImageData[] = [];
      for (let i = 0; i < frameCount; i++) {
        const t = i / frameCount;
        rendererRef.current?.setPointer(
          Math.sin(t * Math.PI * 2) * params.wiggleAmplitude,
          Math.cos(t * Math.PI * 2) * params.wiggleAmplitude * 0.7,
        );
        await new Promise((r) => requestAnimationFrame(r));
        const frame = grabCanvasFrame(canvas);
        if (frame) frames.push(frame);
        setExportPct(Math.round(((i + 1) / frameCount) * 100));
      }
      const blob = await encodeGif(frames, 80);
      setGifBlob(blob);
      toast.success('GIF 已准备好（适合社交平台）');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'GIF 导出失败');
    } finally {
      setExporting(null);
      setExportPct(0);
    }
  };

  const patchParams = (partial: Partial<Photo3DParams>) => {
    setParams((p) => ({ ...p, ...partial }));
  };

  const busy = depthJob.pending || Boolean(depthProgress);
  const busyLabel = depthProgress
    ? `${depthProgress.status}${depthProgress.percent > 0 ? ` ${depthProgress.percent}%` : ''}`
    : '正在估计深度…';
  const showNetworkHint = Boolean(file) && !ready && !depthJob.error && !depthPaused;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <DownloadButton
            data={videoBlob}
            filename={`photo-3d-loop.${videoExt}`}
            sourceLabel="视频"
            disabled={!videoBlob}
          >
            下载视频
          </DownloadButton>
          <DownloadButton
            data={gifBlob}
            filename="photo-3d-loop.gif"
            mimeType="image/gif"
            sourceLabel="GIF"
            variant="secondary"
            disabled={!gifBlob}
          >
            下载 GIF
          </DownloadButton>
        </>
      }
    >
      <ToolIO
        split="wide-output"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="上传照片" description="选一张人像或风景照，模型约 26MB，首次下载后会缓存到本地">
              <FileDropzone
                accept="image/*"
                onFile={handleFile}
                current={preview ? { name: preview.name, size: preview.size } : null}
              />
            </Panel>

            {file && (
              <Panel title="输出模式">
                <div className="mb-3 flex flex-wrap gap-2">
                  {PHOTO3D_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        setActiveSceneId(scene.id);
                        setMode(scene.mode);
                        setParams(scene.params);
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
                  value={mode}
                  onValueChange={(v) => setMode(v as Photo3DMode)}
                  options={MODE_OPTIONS}
                />
                <div className="mt-3 flex flex-col gap-3">
                  <SliderRow
                    label="摇动幅度"
                    value={Math.round(params.wiggleAmplitude * 100)}
                    onChange={(v) => patchParams({ wiggleAmplitude: v / 100 })}
                    min={10}
                    max={100}
                    step={5}
                    suffix="%"
                  />
                  <SliderRow
                    label="视差强度"
                    value={Math.round(params.parallaxStrength * 100)}
                    onChange={(v) => patchParams({ parallaxStrength: v / 100 })}
                    min={10}
                    max={100}
                    step={5}
                    suffix="%"
                  />
                  {mode === 'blur' && (
                    <SliderRow
                      label="模糊强度"
                      value={Math.round(params.blurStrength * 100)}
                      onChange={(v) => patchParams({ blurStrength: v / 100 })}
                      min={10}
                      max={100}
                      step={5}
                      suffix="%"
                    />
                  )}
                </div>
                <SwitchRow
                  className="mt-3"
                  label="显示深度图"
                  description="灰度预览，近处亮、远处暗"
                  checked={showDepth}
                  onCheckedChange={setShowDepth}
                />
              </Panel>
            )}

            {ready && (
              <Panel title="导出" description="视频适合高质量分享；GIF 体积小但色彩有限">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={exportVideo}
                    disabled={Boolean(exporting) || showDepth}
                  >
                    <Film className="size-3.5" />
                    {exporting === 'video' ? `录制中 ${exportPct}%` : '导出循环视频（5s）'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={exportGif}
                    disabled={Boolean(exporting) || showDepth || mode === 'blur'}
                  >
                    <ImageIcon className="size-3.5" />
                    {exporting === 'gif' ? `编码中 ${exportPct}%` : '导出 GIF'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Safari 导出为 MP4；GIF 仅支持摇动/立体模式
                </p>
              </Panel>
            )}

            {hydrated && ready && (
              <Panel title="交互">
                <Button variant="outline" size="sm" onClick={enableGyro}>
                  <Smartphone className="size-3.5" />
                  启用陀螺仪（手机）
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  桌面端移动鼠标即可摇动；iOS 需点击上方按钮授权
                </p>
              </Panel>
            )}
          </div>
        }
        output={
          <Panel
            title={showDepth ? '深度图' : '3D 预览'}
            description={
              deviceLabel
                ? `推理设备：${deviceLabel}`
                : '上传后自动估计深度，鼠标移动即可看到视差'
            }
            className="relative min-h-[320px]"
          >
            {!file && (
              <EmptyState
                icon={<ImageIcon className="size-8" />}
                title="上传一张照片"
                description="支持 JPG / PNG / WebP，人像效果最佳"
              />
            )}

            {showNetworkHint && (
              <Notice tone="info" className="mb-3">
                首次使用需从 Hugging Face 下载约 26MB 深度模型，完成后会缓存到浏览器。若长时间停在
                0%，请检查网络、代理或防火墙；国内环境可在部署时设置{' '}
                <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">
                  NEXT_PUBLIC_HF_ENDPOINT=https://hf-mirror.com
                </code>{' '}
                镜像地址。
              </Notice>
            )}

            {depthPaused && file && (
              <Notice tone="warning" className="mb-3">
                已取消深度估计。可点击下方「重试」继续，或重新上传图片。
              </Notice>
            )}

            {file && depthJob.error && (
              <div className="mb-3 flex flex-col gap-2">
                <Notice tone="danger">{depthJob.error}</Notice>
                <Button variant="secondary" size="sm" className="self-start" onClick={retryDepth}>
                  <RefreshCw className="size-3.5" />
                  重试加载模型
                </Button>
              </div>
            )}

            {file && showDepth && depth && (
              <canvas
                ref={depthPreviewRef}
                className="mx-auto max-h-[70vh] w-full rounded-xl border border-border object-contain"
              />
            )}

            {file && !showDepth && (
              <div
                ref={viewportRef}
                className={cn(
                  'relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface-2',
                  ready && 'cursor-crosshair',
                )}
                onPointerMove={(e) => ready && handlePointer(e.clientX, e.clientY)}
                onPointerLeave={() => rendererRef.current?.setPointer(0, 0)}
              >
                {!ready && !depthJob.error && (
                  <div className="absolute inset-0 grid place-items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 处理前预览 */}
                    <img
                      src={preview?.url}
                      alt="预览"
                      className="max-h-full max-w-full object-contain opacity-40"
                    />
                  </div>
                )}
              </div>
            )}

            <ProgressOverlay
              show={busy && !exporting}
              label={busyLabel}
              percent={depthProgress?.percent}
              actions={
                busy && !exporting ? (
                  <Button variant="outline" size="sm" onClick={cancelDepth}>
                    <X className="size-3.5" />
                    取消
                  </Button>
                ) : undefined
              }
            />
            <ProgressOverlay show={Boolean(exporting)} label="导出中" percent={exportPct} />
          </Panel>
        }
      />
    </ToolView>
  );
}
