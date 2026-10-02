'use client';

import * as React from 'react';
import {
  Download,
  Link2,
  Pause,
  Play,
  RefreshCw,
  SkipForward,
  Square,
  Sparkles,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Panel, Notice } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import {
  checkRdLabSupport,
  decodeRdLabHash,
  DEFAULT_RD_PARAMS,
  encodeRdLabHash,
  feedKillFromMapPoint,
  mapPointFromFeedKill,
  mulberry32,
  PARAM_MAP_REGIONS,
  QUALITY_LEVELS,
  RD_PALETTES,
  RD_PRESETS,
  RdLabSimulator,
  type RdLabParams,
  type RdLabPreset,
  type RdQualityId,
} from '@/lib/core/rd-lab';
import { useCanvasResize, useHydrated } from '@/lib/hooks';

const DEFAULT_PRESET = RD_PRESETS[0];
const DEFAULT_QUALITY: RdQualityId = 'medium';

function ParamMap({
  feed,
  kill,
  onSelect,
  hoveredId,
  onHover,
}: {
  feed: number;
  kill: number;
  onSelect: (feed: number, kill: number) => void;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const { nx, ny } = mapPointFromFeedKill(feed, kill);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 220;
    const h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i <= 4; i += 1) {
      const gx = (i / 4) * w;
      const gy = (i / 4) * h;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    for (const region of PARAM_MAP_REGIONS) {
      const rx = region.nx * w;
      const ry = region.ny * h;
      const active = hoveredId === region.id;
      ctx.beginPath();
      ctx.arc(rx, ry, active ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? 'rgba(78, 205, 196, 0.95)' : 'rgba(78, 205, 196, 0.55)';
      ctx.fill();
    }

    const cx = nx * w;
    const cy = ny * h;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff6eb4';
    ctx.fill();
  }, [feed, kill, nx, ny, hoveredId]);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nxPos = (e.clientX - rect.left) / rect.width;
    const nyPos = (e.clientY - rect.top) / rect.height;
    const { feed: f, kill: k } = feedKillFromMapPoint(
      Math.max(0, Math.min(1, nxPos)),
      Math.max(0, Math.min(1, nyPos)),
    );
    onSelect(f, k);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    let closest: string | null = null;
    let minDist = 0.06;
    for (const region of PARAM_MAP_REGIONS) {
      const d = Math.hypot(mx - region.nx, my - region.ny);
      if (d < minDist) {
        minDist = d;
        closest = region.id;
      }
    }
    onHover(closest);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair rounded-lg border border-border"
        onPointerDown={handlePointer}
        onPointerMove={(e) => {
          handleMove(e);
          if (e.buttons === 1) handlePointer(e);
        }}
        onPointerLeave={() => onHover(null)}
        aria-label="参数地图：横轴 kill，纵轴 feed"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>kill ↓</span>
        <span>feed →</span>
      </div>
      {hoveredId && (
        <p className="text-xs text-primary">
          {PARAM_MAP_REGIONS.find((r) => r.id === hoveredId)?.name}
        </p>
      )}
    </div>
  );
}

export default function RdLab() {
  const tool = useToolMeta('rd-lab');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simRef = React.useRef<RdLabSimulator | null>(null);
  const rafRef = React.useRef(0);
  const paramsRef = React.useRef<RdLabParams>(DEFAULT_RD_PARAMS);
  const playingRef = React.useRef(true);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordChunksRef = React.useRef<Blob[]>([]);
  const paintingRef = React.useRef(false);
  const hashInitRef = React.useRef(false);
  const [simError, setSimError] = React.useState<string | null>(null);

  const [params, setParams] = React.useState<RdLabParams>(DEFAULT_RD_PARAMS);
  const [presetId, setPresetId] = React.useState(DEFAULT_PRESET.id);
  const [paletteId, setPaletteId] = React.useState('deep-sea');
  const [quality, setQuality] = React.useState<RdQualityId>(DEFAULT_QUALITY);
  const [brushRadius, setBrushRadius] = React.useState(0.04);
  const [playing, setPlaying] = React.useState(true);
  const [iteration, setIteration] = React.useState(0);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [mapHover, setMapHover] = React.useState<string | null>(null);
  const [recordBlob, setRecordBlob] = React.useState<Blob | null>(null);
  const [recording, setRecording] = React.useState(false);

  const webglSupport = React.useMemo(
    () => (hydrated ? checkRdLabSupport() : { ok: true, reason: '' }),
    [hydrated],
  );
  const webglOk = webglSupport.ok && !simError;
  const webglReason = simError ?? webglSupport.reason ?? '';

  const palette = RD_PALETTES.find((p) => p.id === paletteId) ?? RD_PALETTES[0];
  const activePreset = RD_PRESETS.find((p) => p.id === presetId) ?? RD_PRESETS[0];

  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  React.useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useCanvasResize(canvasRef);

  React.useEffect(() => {
    if (!hydrated || hashInitRef.current) return;
    hashInitRef.current = true;

    const decoded = decodeRdLabHash(window.location.hash);
    requestAnimationFrame(() => {
      if (decoded.paletteId) setPaletteId(decoded.paletteId);
      if (decoded.quality) setQuality(decoded.quality);
      if (decoded.params.feed != null && decoded.params.kill != null) {
        setParams((p) => ({ ...p, ...decoded.params }));
        const match = RD_PRESETS.find(
          (pr) =>
            Math.abs(pr.feed - (decoded.params.feed ?? 0)) < 0.0005 &&
            Math.abs(pr.kill - (decoded.params.kill ?? 0)) < 0.0005,
        );
        if (match) setPresetId(match.id);
      }
    });
  }, [hydrated]);

  React.useEffect(() => {
    if (!hydrated || !webglSupport.ok) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    simRef.current?.dispose();

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayW = Math.round(rect.width * dpr);
    const displayH = Math.round(rect.height * dpr);
    canvas.width = displayW;
    canvas.height = displayH;

    try {
      const sim = new RdLabSimulator(canvas);
      const aspect = displayW / displayH;
      sim.resizeSim(QUALITY_LEVELS[quality].resolution, aspect);
      sim.randomSeed(mulberry32(Date.now()), 20, 0.022);
      simRef.current = sim;
      requestAnimationFrame(() => {
        setSimError(null);
        setIteration(0);
      });
    } catch (err) {
      requestAnimationFrame(() => {
        setSimError(err instanceof Error ? err.message : 'WebGL 初始化失败');
      });
    }

    return () => {
      simRef.current?.dispose();
      simRef.current = null;
    };
  }, [hydrated, webglSupport.ok, quality]);

  React.useEffect(() => {
    if (!webglOk) return;

    const tick = () => {
      const canvas = canvasRef.current;
      const sim = simRef.current;
      if (canvas && sim) {
        if (playingRef.current) {
          sim.step(paramsRef.current, paramsRef.current.stepsPerFrame);
          if (sim.iteration % 20 === 0) {
            setIteration(sim.iteration);
          }
        }
        sim.display(palette, canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [palette, webglOk]);

  const applyPreset = React.useCallback((preset: RdLabPreset, reseed = true) => {
    setPresetId(preset.id);
    setParams((p) => ({ ...p, feed: preset.feed, kill: preset.kill }));
    paramsRef.current = { ...paramsRef.current, feed: preset.feed, kill: preset.kill };
    if (reseed) {
      const sim = simRef.current;
      if (sim) {
        sim.randomSeed(mulberry32(Date.now()), 20, 0.022);
        setIteration(0);
      }
    }
  }, []);

  const handleMapSelect = (feed: number, kill: number) => {
    setParams((p) => ({ ...p, feed, kill }));
    const match = RD_PRESETS.find(
      (pr) => Math.abs(pr.feed - feed) < 0.001 && Math.abs(pr.kill - kill) < 0.001,
    );
    if (match) setPresetId(match.id);
    else setPresetId('');
  };

  const resetField = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.randomSeed(mulberry32(Date.now()), 20, 0.022);
    setIteration(0);
  };

  const clearField = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.resetField();
    setIteration(0);
  };

  const singleStep = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.step(paramsRef.current, 1);
    setIteration(sim.iteration);
    sim.display(palette, canvasRef.current!.width, canvasRef.current!.height);
  };

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || !sim) return;
    const rect = canvas.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    sim.paint(nx, ny, brushRadius, 1.0);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, 'rd-lab-pattern.png', 'image/png');
        toast.success('快照已导出');
      }
    }, 'image/png');
  };

  const stopRecording = React.useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
    setRecording(false);
  }, []);

  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas || recording) return;
    if (!window.MediaRecorder) {
      toast.error('当前浏览器不支持视频录制');
      return;
    }
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    recordChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: mimeType });
        setRecordBlob(blob);
        toast.success('演化视频已准备好');
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(200);
      setRecording(true);
      setPlaying(true);
      toast.info('录制中… 15 秒后自动停止');
      window.setTimeout(() => stopRecording(), 15_000);
    } catch {
      toast.error('无法启动录制');
    }
  };

  const shareUrl = React.useMemo(() => {
    if (!hydrated) return '';
    const hash = encodeRdLabHash(params, paletteId, quality);
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }, [hydrated, params, paletteId, quality]);

  const qualityOptions = Object.entries(QUALITY_LEVELS).map(([id, q]) => ({
    value: id,
    label: q.label,
  }));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={resetField} disabled={!webglOk}>
            <Sparkles className="size-3.5" />
            随机播种
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={!webglOk}>
            <Download className="size-3.5" />
            导出 PNG
          </Button>
          {recording ? (
            <Button variant="secondary" size="sm" onClick={stopRecording}>
              <Square className="size-3.5" />
              停止录制
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={startRecording} disabled={!webglOk}>
              <Video className="size-3.5" />
              录制 15s
            </Button>
          )}
          <DownloadButton
            data={recordBlob}
            filename="rd-lab-evolution.webm"
            sourceLabel="视频"
            disabled={!recordBlob}
          />
          {shareUrl && (
            <CopyButton value={shareUrl}>
              <Link2 className="size-3.5" />
              分享链接
            </CopyButton>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!webglOk && (
          <Notice tone="danger">
            {webglReason || 'WebGL2 浮点纹理不可用，无法运行反应扩散模拟。请使用 Chrome、Edge 或 Firefox 桌面版。'}
          </Notice>
        )}

        <div className="flex flex-wrap gap-2">
          {RD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              disabled={!webglOk}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                presetId === preset.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <span
                className="size-5 rounded-md border border-border/50"
                style={{
                  background: `linear-gradient(135deg, ${preset.swatch.join(', ')})`,
                }}
              />
              {preset.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {RD_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaletteId(p.id)}
              disabled={!webglOk}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                paletteId === p.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <span className="flex gap-0.5">
                {p.colors.slice(-3).map((c) => (
                  <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <Panel padded={false} bodyClassName="relative">
            <canvas
              ref={canvasRef}
              className="aspect-square w-full max-h-[min(72vh,720px)] cursor-crosshair rounded-2xl"
              style={{ background: palette.background }}
              onPointerDown={(e) => {
                if (!webglOk) return;
                paintingRef.current = true;
                (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                paintAt(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (paintingRef.current) paintAt(e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                paintingRef.current = false;
              }}
              aria-label="反应扩散画布，拖动笔刷涂抹种子"
            />
            <div className="absolute top-3 left-3 flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                className="h-7 bg-surface/80 backdrop-blur-sm"
                onClick={() => setPlaying((p) => !p)}
                disabled={!webglOk}
              >
                {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {playing ? '暂停' : '播放'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 bg-surface/80 backdrop-blur-sm"
                onClick={singleStep}
                disabled={!webglOk}
              >
                <SkipForward className="size-3.5" />
                单步
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 bg-surface/80 backdrop-blur-sm"
                onClick={clearField}
                disabled={!webglOk}
              >
                <RefreshCw className="size-3.5" />
                清空
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              className="absolute top-3 right-3 rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-xs backdrop-blur-sm"
            >
              {panelOpen ? '收起参数' : '参数'}
            </button>
            <div className="absolute right-3 bottom-3 rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
              迭代 {iteration.toLocaleString()} · {QUALITY_LEVELS[quality].label}
            </div>
          </Panel>

          <Panel title="参数地图" description="点击选择 feed / kill 组合">
            <ParamMap
              feed={params.feed}
              kill={params.kill}
              onSelect={handleMapSelect}
              hoveredId={mapHover}
              onHover={setMapHover}
            />
            <p className="mt-3 text-xs text-muted-foreground">
              feed {params.feed.toFixed(4)} · kill {params.kill.toFixed(4)}
            </p>
            {activePreset.description && presetId && (
              <Notice tone="info" className="mt-3 text-xs">
                {activePreset.description}
              </Notice>
            )}
          </Panel>
        </div>

        {panelOpen && (
          <Panel title="高级参数">
            <div className="flex flex-col gap-3">
              <SegmentedControl
                value={quality}
                onValueChange={(v) => setQuality(v as RdQualityId)}
                options={qualityOptions}
              />
              <SliderRow
                label="每帧子步数"
                value={params.stepsPerFrame}
                onChange={(v) => setParams((p) => ({ ...p, stepsPerFrame: v }))}
                min={1}
                max={30}
                step={1}
              />
              <SliderRow
                label="笔刷半径（%）"
                value={Math.round(brushRadius * 1000)}
                onChange={(v) => setBrushRadius(v / 1000)}
                min={10}
                max={120}
                step={5}
              />
              <SliderRow
                label="Feed"
                value={Math.round(params.feed * 10000)}
                onChange={(v) => {
                  setParams((p) => ({ ...p, feed: v / 10000 }));
                  setPresetId('');
                }}
                min={200}
                max={800}
                step={5}
              />
              <SliderRow
                label="Kill"
                value={Math.round(params.kill * 10000)}
                onChange={(v) => {
                  setParams((p) => ({ ...p, kill: v / 10000 }));
                  setPresetId('');
                }}
                min={450}
                max={700}
                step={5}
              />
            </div>
          </Panel>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: '迭代', value: iteration.toLocaleString(), tone: 'primary' },
            { label: 'Feed', value: params.feed.toFixed(4) },
            { label: 'Kill', value: params.kill.toFixed(4) },
            {
              label: '状态',
              value: recording ? '录制中' : playing ? '演化中' : '已暂停',
              tone: recording ? 'warning' : playing ? 'success' : 'default',
            },
          ]}
        />
      </div>
    </ToolView>
  );
}
