'use client';

import * as React from 'react';
import { Download, Maximize2, Pause, Play, Square } from 'lucide-react';
import { toast } from 'sonner';

import { BusyOverlay, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import { loadImage } from '@/lib/core/browser';
import {
  buildPaletteFromPrimary,
  COLOR_PRESETS,
  createDemoFrameData,
  createParticlePool,
  DEFAULT_CONFIG,
  DEFAULT_FPS,
  decodeAudioBuffer,
  estimateExportSizeBytes,
  exportMusicVideo,
  formatTime,
  isExportSupported,
  PARTICLE_POOL_SIZE,
  precomputeFrameData,
  renderMusicVideoFrame,
  RESOLUTION_PRESETS,
  type AudioFrameData,
  type ExportProgress,
  type MusicVideoConfig,
  type Particle,
  type ResolutionPreset,
  VISUAL_STYLES,
} from '@/lib/core/music-video';
import { useAsyncComputed, useHydrated } from '@/lib/hooks';
import { cn, formatBytes } from '@/lib/utils';

function StylePreviewCard({
  styleId,
  name,
  active,
  onClick,
  palette,
}: {
  styleId: MusicVideoConfig['style'];
  name: string;
  active: boolean;
  onClick: () => void;
  palette: string[];
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const timeRef = React.useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const particles = createParticlePool(40, w, h, palette);
    let raf = 0;

    const loop = () => {
      timeRef.current += 0.016;
      const frame = createDemoFrameData(timeRef.current + styleId.length * 0.3);
      const config: MusicVideoConfig = {
        ...DEFAULT_CONFIG,
        style: styleId,
        palette,
        text: { ...DEFAULT_CONFIG.text, show: false },
      };
      if (styleId === 'particles') {
        frame.bassEnergy = 0.5 + Math.sin(timeRef.current * 3) * 0.35;
      }
      renderMusicVideoFrame(ctx, w, h, frame, config, particles, 1 / 30);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [styleId, palette]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border text-left transition-colors',
        active
          ? 'border-primary ring-2 ring-primary/25'
          : 'border-border hover:border-border-strong',
      )}
    >
      <canvas ref={canvasRef} width={160} height={90} className="aspect-video w-full bg-surface-2" />
      <span className="px-2.5 py-2 text-xs font-medium">{name}</span>
    </button>
  );
}

export default function MusicVideo() {
  const tool = useToolMeta('music-video');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const rafRef = React.useRef(0);
  const demoTimeRef = React.useRef(0);

  const [file, setFile] = React.useState<File | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [config, setConfig] = React.useState<MusicVideoConfig>(DEFAULT_CONFIG);
  const [resolutionId, setResolutionId] = React.useState<ResolutionPreset['id']>('720p-v');
  const [playing, setPlaying] = React.useState(false);
  const [scrubTime, setScrubTime] = React.useState(0);
  const [scrubbing, setScrubbing] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [exportBlob, setExportBlob] = React.useState<Blob | null>(null);
  const [exportProgress, setExportProgress] = React.useState<ExportProgress | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const exportAbortRef = React.useRef<AbortController | null>(null);

  const resolution =
    RESOLUTION_PRESETS.find((r) => r.id === resolutionId) ?? RESOLUTION_PRESETS[2]!;

  const audioJob = useAsyncComputed(
    async () => {
      if (!file) return null;
      const buffer = await file.arrayBuffer();
      const decoded = await decodeAudioBuffer(buffer);
      const frames = precomputeFrameData(decoded, DEFAULT_FPS, undefined, config.sensitivity);
      return { buffer: decoded, frames };
    },
    [file, config.sensitivity],
    { enabled: Boolean(file), delay: 150 },
  );

  const frames = audioJob.value?.frames ?? null;
  const audioBuffer = audioJob.value?.buffer ?? null;
  const duration = audioBuffer?.duration ?? 0;

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  React.useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    if (hydrated) {
      void audio.play().catch(() => {
        /* 浏览器可能拦截自动播放，用户可手动点播放 */
      });
    }

    return () => {
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audioRef.current = null;
    };
  }, [audioUrl, hydrated]);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    particlesRef.current = createParticlePool(PARTICLE_POOL_SIZE, 800, 450, config.palette);
  }, [config.palette, config.style]);

  const getFrameAtTime = React.useCallback(
    (time: number): AudioFrameData => {
      if (frames && frames.length > 0) {
        const idx = Math.min(frames.length - 1, Math.max(0, Math.floor(time * DEFAULT_FPS)));
        return frames[idx]!;
      }
      return createDemoFrameData(time);
    },
    [frames],
  );

  const renderAtTime = React.useCallback(
    (time: number, dt: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const frame = getFrameAtTime(time);
      renderMusicVideoFrame(ctx, canvas.width, canvas.height, frame, config, particlesRef.current, dt);
    },
    [config, getFrameAtTime],
  );

  const playingRef = React.useRef(playing);
  const scrubbingRef = React.useRef(scrubbing);
  const scrubTimeRef = React.useRef(scrubTime);

  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  React.useEffect(() => {
    scrubbingRef.current = scrubbing;
  }, [scrubbing]);

  React.useEffect(() => {
    scrubTimeRef.current = scrubTime;
  }, [scrubTime]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    let last = performance.now();
    let lastScrubSync = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      let t = scrubTimeRef.current;
      if (frames && audioRef.current && playingRef.current && !scrubbingRef.current) {
        t = audioRef.current.currentTime;
        scrubTimeRef.current = t;
        if (now - lastScrubSync > 120) {
          lastScrubSync = now;
          setScrubTime(t);
        }
      } else if (!frames) {
        demoTimeRef.current += dt;
        t = demoTimeRef.current;
        scrubTimeRef.current = t;
      }

      renderAtTime(t, dt);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [frames, renderAtTime]);

  const handleAudioFile = (f: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(f);
    setAudioUrl(URL.createObjectURL(f));
    setScrubTime(0);
    setExportBlob(null);
    setPlaying(false);
  };

  const handleBgFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    try {
      const img = await loadImage(url);
      patchConfig({ bgImage: img, background: 'image' });
    } catch {
      toast.error('背景图片加载失败');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const patchConfig = (partial: Partial<MusicVideoConfig>) => {
    setConfig((c) => ({ ...c, ...partial }));
  };

  const patchText = (partial: Partial<MusicVideoConfig['text']>) => {
    setConfig((c) => ({ ...c, text: { ...c.text, ...partial } }));
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play();
  };

  const handleScrub = (value: number) => {
    setScrubTime(value);
    const audio = audioRef.current;
    if (audio) audio.currentTime = value;
    renderAtTime(value, 1 / DEFAULT_FPS);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  };

  const handleExport = async () => {
    if (!audioBuffer) {
      toast.error('请先上传音频');
      return;
    }
    if (!isExportSupported()) {
      toast.error('当前浏览器不支持视频导出');
      return;
    }

    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExporting(true);
    setExportProgress({ phase: 'preparing', progress: 0, message: '准备中…' });

    try {
      const blob = await exportMusicVideo({
        buffer: audioBuffer,
        config,
        resolution,
        onProgress: setExportProgress,
        signal: controller.signal,
      });
      setExportBlob(blob);
      toast.success('视频已导出，可再次下载');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出失败';
      if (msg !== '已取消') toast.error(msg);
    } finally {
      setExporting(false);
      exportAbortRef.current = null;
    }
  };

  const cancelExport = () => {
    exportAbortRef.current?.abort();
  };

  const estimatedSize = audioBuffer
    ? estimateExportSizeBytes(audioBuffer.duration, resolution.width, resolution.height)
    : 0;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          {audioBuffer && (
            <Button variant="secondary" size="sm" onClick={togglePlay}>
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? '暂停' : '播放'}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="size-3.5" />
            全屏
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={!audioBuffer || exporting || audioJob.pending}
          >
            <Download className="size-3.5" />
            导出视频
          </Button>
          {exporting && (
            <Button variant="secondary" size="sm" onClick={cancelExport}>
              <Square className="size-3.5" />
              取消
            </Button>
          )}
          <DownloadButton
            data={exportBlob}
            filename={`music-video-${resolution.id}.${exportBlob?.type.includes('mp4') ? 'mp4' : 'webm'}`}
            sourceLabel="视频"
            disabled={!exportBlob}
          />
        </>
      }
    >
      <ToolIO
        split="wide-output"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="音频">
              <FileDropzone
                accept="audio/*"
                hint="支持 MP3、WAV、FLAC、OGG 等常见格式"
                onFile={handleAudioFile}
                current={
                  file
                    ? { name: file.name, size: file.size }
                    : null
                }
                onRemove={() => {
                  if (audioUrl) URL.revokeObjectURL(audioUrl);
                  setFile(null);
                  setAudioUrl(null);
                  setScrubTime(0);
                  setPlaying(false);
                }}
              />
              {audioJob.pending && <Notice tone="info">正在解码音频…</Notice>}
              {audioJob.error && <Notice tone="danger">{audioJob.error}</Notice>}
            </Panel>

            <Panel title="视觉样式" description="点选预览卡片切换">
              <div className="grid grid-cols-2 gap-2">
                {VISUAL_STYLES.map((s) => (
                  <StylePreviewCard
                    key={s.id}
                    styleId={s.id}
                    name={s.name}
                    active={config.style === s.id}
                    onClick={() => patchConfig({ style: s.id })}
                    palette={config.palette}
                  />
                ))}
              </div>
            </Panel>

            <Panel
              title="参数"
              actions={
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setPanelOpen((o) => !o)}
                >
                  {panelOpen ? '收起' : '展开'}
                </button>
              }
            >
              <div className="flex flex-col gap-3">
                <SliderRow
                  label="灵敏度"
                  value={config.sensitivity}
                  onChange={(v) => patchConfig({ sensitivity: v })}
                  min={0.5}
                  max={3}
                  step={0.1}
                />

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">配色</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        title={p.name}
                        onClick={() =>
                          patchConfig({
                            primaryColor: p.primary,
                            palette: buildPaletteFromPrimary(p.primary),
                          })
                        }
                        className={cn(
                          'size-8 rounded-full border-2 transition-transform hover:scale-105',
                          config.primaryColor === p.primary
                            ? 'border-foreground'
                            : 'border-transparent',
                        )}
                        style={{ backgroundColor: p.primary }}
                      />
                    ))}
                  </div>
                </div>

                <SegmentedControl
                  value={config.background}
                  onValueChange={(v) =>
                    patchConfig({ background: v as MusicVideoConfig['background'] })
                  }
                  options={[
                    { value: 'gradient', label: '渐变' },
                    { value: 'solid', label: '纯色' },
                    { value: 'image', label: '图片' },
                    { value: 'transparent', label: '透明' },
                  ]}
                />

                {config.background === 'image' && (
                  <FileDropzone
                    accept="image/*"
                    hint="上传背景图（自动模糊）"
                    onFile={handleBgFile}
                  />
                )}

                <SwitchRow
                  label="显示标题文字"
                  checked={config.text.show}
                  onCheckedChange={(v) => patchText({ show: v })}
                />

                {panelOpen && (
                  <>
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={config.text.title}
                      onChange={(e) => patchText({ title: e.target.value })}
                      placeholder="曲名"
                    />
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={config.text.subtitle}
                      onChange={(e) => patchText({ subtitle: e.target.value })}
                      placeholder="艺术家"
                    />
                    <SegmentedControl
                      value={config.text.position}
                      onValueChange={(v) =>
                        patchText({ position: v as MusicVideoConfig['text']['position'] })
                      }
                      options={[
                        { value: 'top', label: '顶部' },
                        { value: 'center', label: '居中' },
                        { value: 'bottom', label: '底部' },
                      ]}
                    />
                  </>
                )}
              </div>
            </Panel>

            <Panel title="导出设置">
              <SegmentedControl
                value={resolutionId}
                onValueChange={setResolutionId}
                options={RESOLUTION_PRESETS.map((r) => ({ value: r.id, label: r.label }))}
              />
              {audioBuffer && (
                <StatGrid
                  className="mt-3"
                  columns={3}
                  items={[
                    { label: '时长', value: formatTime(duration) },
                    {
                      label: '分辨率',
                      value: `${resolution.width}×${resolution.height}`,
                    },
                    {
                      label: '预估体积',
                      value: formatBytes(estimatedSize),
                      hint: '实际因编码器而异',
                    },
                  ]}
                />
              )}
              {!isExportSupported() && (
                <Notice tone="warning" className="mt-3">
                  当前浏览器不支持 MediaRecorder 视频导出。Chrome / Edge 体验最佳；Safari 将输出 MP4。
                </Notice>
              )}
            </Panel>
          </div>
        }
        output={
          <Panel title="预览" bodyClassName="p-0">
            <div ref={containerRef} className="relative aspect-video w-full bg-surface-2">
              <canvas ref={canvasRef} className="size-full" />
              <BusyOverlay
                show={exporting}
                label={
                  exportProgress
                    ? `${exportProgress.message} (${Math.round(exportProgress.progress * 100)}%)`
                    : '导出中…'
                }
              />
              {!file && (
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] text-white">
                    演示动画 · 上传音频后开始同步预览
                  </span>
                </div>
              )}
            </div>

            {audioBuffer ? (
              <div className="border-t border-border p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatTime(scrubTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div
                  onPointerDown={() => setScrubbing(true)}
                  onPointerUp={() => setScrubbing(false)}
                  onPointerLeave={() => setScrubbing(false)}
                >
                  <SliderRow
                    label="时间轴"
                    value={scrubTime}
                    onChange={handleScrub}
                    min={0}
                    max={Math.max(0.01, duration)}
                    step={0.05}
                  />
                </div>
              </div>
            ) : (
              <EmptyState
                title="上传一首音乐"
                description="支持本地音频文件，解码后立即开始可视化预览"
              />
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
