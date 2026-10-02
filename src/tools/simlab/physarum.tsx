'use client';

import * as React from 'react';
import { Circle, Download, RefreshCw, Square, Video } from 'lucide-react';
import { toast } from 'sonner';

import { DownloadButton, StatGrid } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Panel, Notice } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import {
  clearPhysarumTrail,
  createPhysarumState,
  DEFAULT_PHYSARUM_PARAMS,
  foodsForPreset,
  mulberry32,
  PHYSARUM_PALETTES,
  PHYSARUM_PRESETS,
  renderPhysarum,
  resizeAgentCount,
  stepPhysarum,
  type FoodPoint,
  type PhysarumParams,
  type PhysarumState,
} from '@/lib/core/physarum';

const GRID_SIZE = 400;
const STEPS_PER_FRAME = 2;
const DEFAULT_PRESET = 'tokyo';

function drawFoodMarkers(
  ctx: CanvasRenderingContext2D,
  foods: FoodPoint[],
  width: number,
  height: number,
  pulse: number,
) {
  for (const food of foods) {
    const x = food.x * width;
    const y = food.y * height;
    const r = 6 + Math.sin(pulse) * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 200, 80, 0.15)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 220, 100, 0.95)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export default function Physarum() {
  const tool = useToolMeta('physarum');
  useTrackRecent(tool.slug);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef<PhysarumState | null>(null);
  const paramsRef = React.useRef<PhysarumParams>(DEFAULT_PHYSARUM_PARAMS);
  const foodsRef = React.useRef<FoodPoint[]>(foodsForPreset(DEFAULT_PRESET));
  const rafRef = React.useRef(0);
  const pulseRef = React.useRef(0);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordChunksRef = React.useRef<Blob[]>([]);

  const [presetId, setPresetId] = React.useState(DEFAULT_PRESET);
  const [paletteId, setPaletteId] = React.useState('slime');
  const [params, setParams] = React.useState<PhysarumParams>(DEFAULT_PHYSARUM_PARAMS);
  const [foods, setFoods] = React.useState<FoodPoint[]>(() => foodsForPreset(DEFAULT_PRESET));
  const [iteration, setIteration] = React.useState(0);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [recordBlob, setRecordBlob] = React.useState<Blob | null>(null);
  const [recording, setRecording] = React.useState(false);

  const palette = PHYSARUM_PALETTES.find((p) => p.id === paletteId) ?? PHYSARUM_PALETTES[0];
  const activePreset = PHYSARUM_PRESETS.find((p) => p.id === presetId) ?? PHYSARUM_PRESETS[0];

  if (stateRef.current == null) {
    stateRef.current = createPhysarumState(GRID_SIZE, GRID_SIZE, DEFAULT_PHYSARUM_PARAMS);
  }

  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  React.useEffect(() => {
    foodsRef.current = foods;
  }, [foods]);

  const resetTrail = React.useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    clearPhysarumTrail(state);
    resizeAgentCount(state, paramsRef.current.agentCount);
    setIteration(0);
  }, []);

  const applyPreset = React.useCallback((id: string) => {
    setPresetId(id);
    const seed = Math.floor(mulberry32(Date.now())() * 1_000_000);
    const nextFoods = foodsForPreset(id, seed);
    setFoods(nextFoods);
    foodsRef.current = nextFoods;
    resetTrail();
  }, [resetTrail]);

  const renderFrame = React.useCallback(() => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const imageData = renderPhysarum(state, palette, w, h);
    ctx.putImageData(imageData, 0, 0);
    drawFoodMarkers(ctx, foodsRef.current, w, h, pulseRef.current);
  }, [palette]);

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      recorderRef.current?.stop();
    };
  }, []);

  React.useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    if (state.agents.length / 3 !== params.agentCount) {
      resizeAgentCount(state, params.agentCount);
    }
  }, [params.agentCount]);

  React.useEffect(() => {
    const tick = () => {
      const state = stateRef.current;
      if (state) {
        for (let s = 0; s < STEPS_PER_FRAME; s += 1) {
          stepPhysarum(state, paramsRef.current, foodsRef.current);
        }
        pulseRef.current += 0.08;
        if (state.iteration % 4 === 0) {
          setIteration(state.iteration);
        }
        renderFrame();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderFrame]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const point: FoodPoint = { x, y, strength: 2.5 };
    setFoods((prev) => {
      const next = [...prev, point];
      foodsRef.current = next;
      return next;
    });
    toast.success('已放置食物点');
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, 'physarum-network.png', 'image/png');
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
        toast.success('生长视频已准备好');
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(200);
      setRecording(true);
      toast.info('录制中… 15 秒后自动停止');
      window.setTimeout(() => stopRecording(), 15_000);
    } catch {
      toast.error('无法启动录制');
    }
  };

  const patchParams = (partial: Partial<PhysarumParams>) => {
    setParams((p) => ({ ...p, ...partial }));
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={resetTrail}>
            <RefreshCw className="size-3.5" />
            重置痕迹
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
            导出 PNG
          </Button>
          {recording ? (
            <Button variant="secondary" size="sm" onClick={stopRecording}>
              <Square className="size-3.5" />
              停止录制
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={startRecording}>
              <Video className="size-3.5" />
              录制 15s
            </Button>
          )}
          <DownloadButton
            data={recordBlob}
            filename="physarum-growth.webm"
            sourceLabel="视频"
            disabled={!recordBlob}
          />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {PHYSARUM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                presetId === preset.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              {preset.name}
            </button>
          ))}
          {PHYSARUM_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaletteId(p.id)}
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

        {activePreset.description && (
          <Notice tone="info" icon={<Circle className="size-4" />}>
            {activePreset.description}
          </Notice>
        )}

        <Panel padded={false} bodyClassName="relative">
          <canvas
            ref={canvasRef}
            className="aspect-square w-full max-h-[min(72vh,720px)] cursor-crosshair rounded-2xl"
            style={{ background: palette.background }}
            onClick={handleCanvasClick}
            aria-label="黏菌模拟画布，点击放置食物点"
          />
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="absolute top-3 right-3 rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-xs backdrop-blur-sm"
          >
            {panelOpen ? '收起参数' : '参数'}
          </button>
          <div className="absolute right-3 bottom-3 rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
            迭代 {iteration.toLocaleString()} · {params.agentCount.toLocaleString()} agents
          </div>
        </Panel>

        {panelOpen && (
          <Panel title="模拟参数">
            <div className="flex flex-col gap-3">
              <SliderRow
                label="Agent 数量"
                value={params.agentCount}
                onChange={(v) => patchParams({ agentCount: v })}
                min={5000}
                max={100_000}
                step={5000}
              />
              <SliderRow
                label="感知角度（×100）"
                value={Math.round(params.sensorAngle * 100)}
                onChange={(v) => patchParams({ sensorAngle: v / 100 })}
                min={10}
                max={80}
                step={1}
              />
              <SliderRow
                label="痕迹衰减（×1000）"
                value={Math.round(params.decay * 1000)}
                onChange={(v) => patchParams({ decay: v / 1000 })}
                min={900}
                max={990}
                step={2}
              />
              <SliderRow
                label="扩散强度（%）"
                value={Math.round(params.diffusion * 100)}
                onChange={(v) => patchParams({ diffusion: v / 100 })}
                min={10}
                max={80}
                step={1}
              />
            </div>
          </Panel>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: '迭代次数', value: iteration.toLocaleString(), tone: 'primary' },
            { label: 'Agents', value: params.agentCount.toLocaleString() },
            { label: '食物点', value: foods.length.toString(), tone: 'warning' },
            {
              label: '状态',
              value: recording ? '录制中' : '运行中',
              tone: recording ? 'warning' : 'success',
            },
          ]}
        />
      </div>
    </ToolView>
  );
}
