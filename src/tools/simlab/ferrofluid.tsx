'use client';

import * as React from 'react';
import { Circle, Download, Magnet, Mic, MicOff, RefreshCw, Video } from 'lucide-react';
import { toast } from 'sonner';

import { DownloadButton, StatGrid } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import {
  checkFerrofluidSupport,
  createFerrofluidState,
  DEFAULT_FERROFLUID_PARAMS,
  FERROFLUID_BACKGROUND,
  FERROFLUID_PRESETS,
  FERROFLUID_QUALITY,
  FerrofluidRenderer,
  renderFerrofluidCanvas2D,
  stepFerrofluid,
  syncFerrofluidParticleCount,
  type FerrofluidParams,
  type FerrofluidQualityId,
  type FerrofluidState,
} from '@/lib/core/ferrofluid';
import { useHydrated } from '@/lib/hooks';

const DEFAULT_PRESET = FERROFLUID_PRESETS[0];
const DEFAULT_QUALITY: FerrofluidQualityId = 'medium';

export default function Ferrofluid() {
  const tool = useToolMeta('ferrofluid');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef<FerrofluidState | null>(null);
  const rendererRef = React.useRef<FerrofluidRenderer | null>(null);
  const rafRef = React.useRef(0);
  const fpsRef = React.useRef({ frames: 0, last: 0 });
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordChunksRef = React.useRef<Blob[]>([]);

  const [params, setParams] = React.useState<FerrofluidParams>({
    ...DEFAULT_FERROFLUID_PARAMS,
    particleCount: FERROFLUID_QUALITY[DEFAULT_QUALITY].particleCount,
  });
  const [qualityId, setQualityId] = React.useState<FerrofluidQualityId>(DEFAULT_QUALITY);
  const [presetId, setPresetId] = React.useState(DEFAULT_PRESET.id);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [audioMode, setAudioMode] = React.useState(false);
  const [renderError, setRenderError] = React.useState('');
  const [recordBlob, setRecordBlob] = React.useState<Blob | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [fps, setFps] = React.useState(0);
  const [seed, setSeed] = React.useState(() => Math.floor(Math.random() * 1_000_000));

  const paramsRef = React.useRef(params);
  const presetIdRef = React.useRef(presetId);
  const audioModeRef = React.useRef(audioMode);

  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  React.useEffect(() => {
    presetIdRef.current = presetId;
  }, [presetId]);

  React.useEffect(() => {
    audioModeRef.current = audioMode;
  }, [audioMode]);

  const webglSupport = React.useMemo(
    () => (hydrated ? checkFerrofluidSupport() : { ok: true, reason: '' }),
    [hydrated],
  );
  const webglOk = webglSupport.ok && !renderError;
  const webglReason = renderError || webglSupport.reason || '';

  const initWorld = React.useCallback(
    (nextParams: FerrofluidParams, nextPresetId: string, nextSeed: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;

      stateRef.current = createFerrofluidState(w, h, nextParams, nextPresetId, nextSeed);

      if (webglSupport.ok) {
        try {
          if (!rendererRef.current) {
            rendererRef.current = new FerrofluidRenderer(canvas);
          }
          rendererRef.current.resize(w, h);
          setRenderError('');
        } catch {
          setRenderError('WebGL2 初始化失败');
        }
      }
    },
    [webglSupport.ok],
  );

  const resetFluid = React.useCallback(() => {
    const nextSeed = Math.floor(Math.random() * 1_000_000);
    setSeed(nextSeed);
    initWorld(paramsRef.current, presetIdRef.current, nextSeed);
    toast.success('磁流体已重置');
  }, [initWorld]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const state = stateRef.current;
    if (state) state.presetId = id;
  };

  const applyQuality = (id: FerrofluidQualityId) => {
    const q = FERROFLUID_QUALITY[id];
    setQualityId(id);
    setParams((p) => ({ ...p, particleCount: q.particleCount }));
  };

  const stopAudio = React.useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    const state = stateRef.current;
    if (state) state.audioLevel = 0;
  }, []);

  const startAudio = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      mediaStreamRef.current = stream;
      toast.success('音频模式已开启，播放音乐试试');
    } catch {
      toast.error('无法访问麦克风，请检查浏览器权限');
      setAudioMode(false);
    }
  }, []);

  React.useEffect(() => () => stopAudio(), [stopAudio]);

  const toggleAudioMode = React.useCallback(
    async (next: boolean) => {
      if (!next) {
        stopAudio();
        setAudioMode(false);
        return;
      }
      setAudioMode(true);
      await startAudio();
    },
    [startAudio, stopAudio],
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => initWorld(paramsRef.current, presetIdRef.current, seed);
    resize();
    window.addEventListener('resize', resize);

    const tick = (now: number) => {
      const state = stateRef.current;
      if (!state) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      state.params = { ...paramsRef.current };
      state.presetId = presetIdRef.current;

      if (audioModeRef.current && analyserRef.current) {
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);
        let sum = 0;
        const bassBins = Math.min(12, buf.length);
        for (let i = 0; i < bassBins; i++) sum += buf[i];
        state.audioLevel = sum / (bassBins * 255);
      } else {
        state.audioLevel = 0;
      }

      stepFerrofluid(state);

      if (webglOk && rendererRef.current) {
        rendererRef.current.render(state);
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) renderFerrofluidCanvas2D(ctx, state);
      }

      const fpsState = fpsRef.current;
      if (fpsState.last === 0) fpsState.last = now;
      fpsState.frames += 1;
      if (now - fpsState.last >= 500) {
        setFps(Math.round((fpsState.frames * 1000) / (now - fpsState.last)));
        fpsState.frames = 0;
        fpsState.last = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [initWorld, seed, webglOk]);

  React.useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    syncFerrofluidParticleCount(state, params.particleCount);
  }, [params.particleCount]);

  const pointerToNorm = (clientX: number, clientY: number, target: HTMLCanvasElement) => {
    const rect = target.getBoundingClientRect();
    const state = stateRef.current;
    if (!state) return;
    state.pointerNx = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width));
    state.pointerNy = Math.max(0.02, Math.min(0.98, (clientY - rect.top) / rect.height));
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `ferrofluid-${seed}.png`, 'image/png');
        toast.success('快照已导出');
      }
    }, 'image/png');
  };

  const stopRecording = React.useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    setRecording(false);
  }, []);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });
      recordChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: 'video/webm' });
        setRecordBlob(blob);
        toast.success('短视频已录制');
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      toast.info('录制中… 再次点击停止');
      window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') stopRecording();
      }, 8000);
    } catch {
      toast.error('当前浏览器不支持画布录制');
    }
  };

  const patchParams = (partial: Partial<FerrofluidParams>) => {
    setParams((p) => ({ ...p, ...partial }));
  };

  const presetIcon = (id: string) => {
    switch (id) {
      case 'single':
        return <Magnet className="size-3.5" />;
      case 'dual':
        return (
          <span className="flex gap-0.5">
            <Magnet className="size-3" />
            <Magnet className="size-3" />
          </span>
        );
      case 'ring':
        return <Circle className="size-3.5" />;
      default:
        return <span className="text-[10px] font-bold">⇅</span>;
    }
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={resetFluid}>
            <RefreshCw className="size-3.5" />
            重置
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
            导出 PNG
          </Button>
          <Button
            variant={recording ? 'primary' : 'secondary'}
            size="sm"
            onClick={recording ? stopRecording : startRecording}
          >
            <Video className="size-3.5" />
            {recording ? '停止录制' : '录短视频'}
          </Button>
          <DownloadButton data={recordBlob} filename={`ferrofluid-${seed}.webm`} />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!webglOk && (
          <Notice tone="warning">
            {webglReason || 'WebGL2 不可用，已降级为 Canvas 渲染，帧率可能较低。'}
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          {FERROFLUID_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => applyPreset(preset.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                presetId === preset.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              {presetIcon(preset.id)}
              {preset.name}
            </button>
          ))}
        </div>

        <Panel padded={false} bodyClassName="relative">
          <canvas
            ref={canvasRef}
            className="aspect-[4/3] w-full cursor-crosshair rounded-2xl touch-none"
            style={{ background: FERROFLUID_BACKGROUND }}
            onPointerMove={(e) => pointerToNorm(e.clientX, e.clientY, e.currentTarget)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              pointerToNorm(e.clientX, e.clientY, e.currentTarget);
            }}
            onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.08 : 0.08;
              patchParams({
                fieldStrength: Math.max(0.3, Math.min(3, params.fieldStrength + delta)),
              });
            }}
          />

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3">
            <p className="text-center text-xs text-white/90">
              {params.particleCount.toLocaleString()} 粒子 ·{' '}
              {webglOk ? 'WebGL2' : 'Canvas'} · {fps > 0 ? `${fps} FPS` : '计算中…'}
              {audioMode ? (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Mic className="size-3" /> 音频
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center gap-1 opacity-60">
                  <MicOff className="size-3" /> 拖动磁铁 · 滚轮调强度
                </span>
              )}
            </p>
          </div>
        </Panel>

        <Panel title="参数" description="拖动磁铁 · 滚轮调强度 · 改动立即生效">
          <div className="flex flex-col gap-3">
            <SliderRow
              label="磁场强度"
              value={Math.round(params.fieldStrength * 100)}
              onChange={(v) => patchParams({ fieldStrength: v / 100 })}
              min={30}
              max={300}
              step={5}
            />
            <SliderRow
              label="液面锐度"
              value={Math.round(params.surfaceThreshold * 100)}
              onChange={(v) => patchParams({ surfaceThreshold: v / 100 })}
              min={20}
              max={70}
              step={1}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">粒子质量</span>
              <SegmentedControl
                value={qualityId}
                onValueChange={(v) => applyQuality(v as FerrofluidQualityId)}
                options={Object.values(FERROFLUID_QUALITY).map((q) => ({
                  value: q.id,
                  label: q.name,
                }))}
                size="sm"
                full
              />
            </div>
            <SwitchRow
              label="音频驱动"
              checked={audioMode}
              onCheckedChange={toggleAudioMode}
              description={audioMode ? '低频能量驱动磁场' : '打开后对着麦克风放歌'}
            />
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="text-left text-xs text-muted-foreground hover:text-foreground"
            >
              {panelOpen ? '收起高级参数' : '展开高级参数…'}
            </button>
            {panelOpen && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <SliderRow
                  label="表面半径"
                  value={Math.round(params.surfaceSharpness * 100)}
                  onChange={(v) => patchParams({ surfaceSharpness: v / 100 })}
                  min={60}
                  max={160}
                  step={5}
                />
                <SliderRow
                  label="黏度"
                  value={Math.round(params.viscosity * 100)}
                  onChange={(v) => patchParams({ viscosity: v / 100 })}
                  min={5}
                  max={40}
                  step={1}
                />
                <SliderRow
                  label="重力"
                  value={Math.round(params.gravity * 100)}
                  onChange={(v) => patchParams({ gravity: v / 100 })}
                  min={0}
                  max={25}
                  step={1}
                />
              </div>
            )}
          </div>
        </Panel>

        <StatGrid
          columns={4}
          items={[
            { label: '粒子', value: params.particleCount.toLocaleString(), tone: 'primary' },
            { label: '磁场', value: params.fieldStrength.toFixed(1) },
            { label: '帧率', value: fps > 0 ? `${fps}` : '—', tone: fps >= 30 ? 'success' : 'warning' },
            { label: '种子', value: String(seed) },
          ]}
        />
      </div>
    </ToolView>
  );
}
