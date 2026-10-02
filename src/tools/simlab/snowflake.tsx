'use client';

import * as React from 'react';
import { Download, Link2, Pause, Play, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Panel, Notice } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import {
  createSnowflake,
  decodeSnowflakeHash,
  encodeSnowflakeHash,
  mulberry32,
  paramsFromPreset,
  renderSnowflake,
  seedToCode,
  simulateSnowflakeComplete,
  SNOWFLAKE_PRESETS,
  stepSnowflake,
  type SnowflakeParams,
  type SnowflakeState,
} from '@/lib/core/snowflake';
import { useHydrated } from '@/lib/hooks';

const DEFAULT_PRESET = 'dendrite';
const SIZE_OPTIONS = [
  { radius: 48, label: '小' },
  { radius: 64, label: '中' },
  { radius: 80, label: '大' },
];
const SPEED_OPTIONS = [
  { value: 1, label: '1×' },
  { value: 2, label: '2×' },
  { value: 4, label: '4×' },
];

function stepsPerFrame(speed: number, radius: number): number {
  const base = Math.max(1, Math.round(radius / 28));
  return base * speed;
}

export default function SnowflakeTool() {
  const tool = useToolMeta('snowflake');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef<SnowflakeState | null>(null);
  const rafRef = React.useRef(0);
  const seedNonceRef = React.useRef(1);
  const initializedRef = React.useRef(false);

  const [presetId, setPresetId] = React.useState(DEFAULT_PRESET);
  const [params, setParams] = React.useState<SnowflakeParams>(() =>
    paramsFromPreset(DEFAULT_PRESET, 42_857),
  );
  const [speed, setSpeed] = React.useState(2);
  const [playing, setPlaying] = React.useState(true);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [frozenCount, setFrozenCount] = React.useState(1);
  const [done, setDone] = React.useState(false);

  const snowflakeCode = seedToCode(params.seed);
  const activePreset = SNOWFLAKE_PRESETS.find((p) => p.id === presetId) ?? SNOWFLAKE_PRESETS[0];

  const draw = React.useCallback(() => {
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

    ctx.clearRect(0, 0, w, h);
    const imageData = renderSnowflake(state, Math.min(w, h));
    ctx.putImageData(imageData, (w - imageData.width) / 2, (h - imageData.height) / 2);
  }, []);

  const restart = React.useCallback(
    (next: SnowflakeParams, autoPlay = true) => {
      stateRef.current = createSnowflake(next);
      setStep(0);
      setFrozenCount(1);
      setDone(false);
      setPlaying(autoPlay);
      draw();
    },
    [draw],
  );

  const rollSeed = React.useCallback(() => {
    seedNonceRef.current += 1;
    return Math.floor(mulberry32(42_857 + seedNonceRef.current * 13_371)() * 9_999_999);
  }, []);

  React.useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;

    const decoded = decodeSnowflakeHash(window.location.hash);
    const preset = decoded.presetId ?? DEFAULT_PRESET;
    const merged = Object.keys(decoded.params).length
      ? { ...paramsFromPreset(preset), ...decoded.params }
      : paramsFromPreset(DEFAULT_PRESET, 42_857);

    requestAnimationFrame(() => {
      setPresetId(preset);
      if (decoded.speed) setSpeed(decoded.speed);
      setParams(merged);
      restart(merged, true);
    });
  }, [hydrated, restart]);

  React.useEffect(() => {
    if (!playing || done) return;

    const tick = () => {
      const state = stateRef.current;
      if (!state || state.done) {
        setDone(true);
        setPlaying(false);
        return;
      }

      stepSnowflake(state, stepsPerFrame(speed, state.params.radius));
      setStep(state.step);
      setFrozenCount(state.frozenCount);
      draw();

      if (state.done) {
        setDone(true);
        setPlaying(false);
        toast.success(`雪花 ${seedToCode(state.params.seed)} 生长完成`);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, done, speed, draw]);

  React.useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const applyPreset = (id: string) => {
    setPresetId(id);
    const next = paramsFromPreset(id, rollSeed());
    setParams(next);
    restart(next, true);
  };

  const newSeed = () => {
    const next = { ...params, seed: rollSeed() };
    setParams(next);
    restart(next, true);
  };

  const patch = (partial: Partial<SnowflakeParams>) => {
    const next = { ...params, ...partial };
    setParams(next);
    restart(next, true);
  };

  const shareUrl = React.useMemo(() => {
    if (!hydrated) return '';
    const hash = encodeSnowflakeHash(params, presetId, speed);
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }, [hydrated, params, presetId, speed]);

  const handleExport = async () => {
    const exportParams = { ...params, radius: Math.max(params.radius, 96) };
    const state = simulateSnowflakeComplete(exportParams);
    const exportSize = 2048;
    const imageData = renderSnowflake(state, exportSize);
    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `snowflake-${snowflakeCode}.png`, 'image/png');
        toast.success('透明 PNG 已导出');
      }
    }, 'image/png');
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={() => setPlaying((p) => !p)} disabled={done}>
            {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {playing ? '暂停' : '继续'}
          </Button>
          <Button variant="secondary" size="sm" onClick={newSeed}>
            <RefreshCw className="size-3.5" />
            新种子
          </Button>
          <CopyButton value={shareUrl} silent={false} sourceLabel="分享链接">
            <Link2 className="size-3.5" />
            分享
          </CopyButton>
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={!done && step < 40}>
            <Download className="size-3.5" />
            导出 2048px
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex shrink-0 flex-col gap-2 lg:w-44">
          <p className="text-xs font-medium text-muted-foreground">形态预设</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            {SNOWFLAKE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors ${
                  presetId === preset.id
                    ? 'border-primary bg-primary-subtle'
                    : 'border-border bg-surface hover:border-border-strong'
                }`}
              >
                <span
                  className="size-10 shrink-0 rounded-lg border border-border/50"
                  style={{
                    background: `linear-gradient(135deg, ${preset.swatch[0]}, ${preset.swatch[1]} 50%, ${preset.swatch[2]})`,
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{preset.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {preset.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Panel padded={false} bodyClassName="relative aspect-square max-h-[min(72vh,640px)] w-full">
            <canvas
              ref={canvasRef}
              className="size-full rounded-2xl"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, oklch(0.22 0.04 250 / 0.9), oklch(0.14 0.03 250))',
              }}
            />
            <div className="absolute top-3 right-3 flex gap-1.5">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSpeed(opt.value)}
                  className={`rounded-lg border px-2 py-1 text-[11px] backdrop-blur-sm ${
                    speed === opt.value
                      ? 'border-primary bg-primary-subtle text-primary'
                      : 'border-border bg-surface/80 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPanelOpen((o) => !o)}
                className="rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-[11px] backdrop-blur-sm"
              >
                {panelOpen ? '收起' : '参数'}
              </button>
            </div>
            {playing && !done && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4">
                <p className="text-center text-xs text-white/90">
                  晶体生长中… 第 {step} 步 · 已结冰 {frozenCount.toLocaleString()} 格
                </p>
              </div>
            )}
          </Panel>

          {panelOpen && (
            <Panel title="生长条件">
              <div className="flex flex-col gap-3">
                <SliderRow
                  label="温度（枝晶 ↔ 板状）"
                  value={Math.round(params.temperature * 100)}
                  onChange={(v) => patch({ temperature: v / 100 })}
                  min={0}
                  max={100}
                  step={1}
                />
                <SliderRow
                  label="湿度（水汽供给）"
                  value={Math.round(params.humidity * 100)}
                  onChange={(v) => patch({ humidity: v / 100 })}
                  min={20}
                  max={95}
                  step={1}
                />
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">大小</span>
                  <SegmentedControl
                    value={String(params.radius)}
                    onValueChange={(v) => patch({ radius: Number(v) })}
                    options={SIZE_OPTIONS.map((s) => ({
                      value: String(s.radius),
                      label: s.label,
                    }))}
                  />
                </div>
              </div>
            </Panel>
          )}

          <StatGrid
            columns={4}
            items={[
              { label: '编号', value: snowflakeCode, tone: 'primary' },
              { label: '预设', value: activePreset.name },
              { label: '已结冰', value: frozenCount.toLocaleString() },
              {
                label: '状态',
                value: done ? '已完成' : playing ? '生长中' : '已暂停',
                tone: done ? 'success' : 'primary',
              },
            ]}
          />

          {done && (
            <Notice tone="success" icon={<Sparkles />}>
              世界上仅此一片 · 编号 {snowflakeCode}。导出为透明 PNG，适合做冬日贺卡与海报纹样。
            </Notice>
          )}
        </div>
      </div>
    </ToolView>
  );
}
