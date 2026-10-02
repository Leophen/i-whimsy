'use client';

import * as React from 'react';
import { Dices, Download, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { StatGrid } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow, SwitchRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import {
  cloneMatrix,
  createParticleLifeState,
  DEFAULT_PARTICLE_LIFE_PARAMS,
  generateRandomMatrix,
  getPresetById,
  mulberry32,
  PARTICLE_LIFE_BACKGROUND,
  PARTICLE_LIFE_PRESETS,
  remapSpecies,
  renderParticleLife,
  resizeMatrix,
  SPECIES_COLORS,
  stepParticleLife,
  syncParticleCount,
  type ParticleLifeParams,
  type ParticleLifeState,
} from '@/lib/core/particle-life';

const DEFAULT_PRESET = PARTICLE_LIFE_PRESETS[0];

export default function ParticleLife() {
  const tool = useToolMeta('particle-life');
  useTrackRecent(tool.slug);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef<ParticleLifeState | null>(null);
  const rafRef = React.useRef(0);
  const fpsRef = React.useRef({ frames: 0, last: 0 });

  const [params, setParams] = React.useState<ParticleLifeParams>({
    ...DEFAULT_PARTICLE_LIFE_PARAMS,
    speciesCount: DEFAULT_PRESET.speciesCount,
    particleCount: DEFAULT_PRESET.particleCount ?? DEFAULT_PARTICLE_LIFE_PARAMS.particleCount,
  });
  const [matrix, setMatrix] = React.useState<number[][]>(() => cloneMatrix(DEFAULT_PRESET.matrix));
  const [presetId, setPresetId] = React.useState(DEFAULT_PRESET.id);
  const [trail, setTrail] = React.useState(true);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [fps, setFps] = React.useState(0);
  const [seed, setSeed] = React.useState(() => Math.floor(Math.random() * 1_000_000));

  const matrixRef = React.useRef(matrix);
  const paramsRef = React.useRef(params);

  React.useEffect(() => {
    matrixRef.current = matrix;
  }, [matrix]);

  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const initWorld = React.useCallback(
    (nextMatrix: number[][] | null, nextParams: ParticleLifeParams, nextSeed: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;

      const m = nextMatrix ?? matrixRef.current;
      stateRef.current = createParticleLifeState(w, h, nextParams, m, nextSeed);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderParticleLife(ctx, stateRef.current, { trail: false });
      }
    },
    [],
  );

  const applyPreset = React.useCallback(
    (id: string) => {
      const preset = getPresetById(id);
      if (!preset) return;
      const nextParams: ParticleLifeParams = {
        ...paramsRef.current,
        speciesCount: preset.speciesCount,
        particleCount: preset.particleCount ?? paramsRef.current.particleCount,
      };
      const nextMatrix = cloneMatrix(preset.matrix);
      const nextSeed = Math.floor(Math.random() * 1_000_000);
      setPresetId(id);
      setParams(nextParams);
      setMatrix(nextMatrix);
      setSeed(nextSeed);
      initWorld(nextMatrix, nextParams, nextSeed);
    },
    [initWorld],
  );

  const randomizeWorld = React.useCallback(() => {
    const nextSeed = Math.floor(Math.random() * 1_000_000);
    const nextMatrix = generateRandomMatrix(paramsRef.current.speciesCount, nextSeed);
    setPresetId('');
    setMatrix(nextMatrix);
    setSeed(nextSeed);
    initWorld(nextMatrix, paramsRef.current, nextSeed);
    toast.success('新世界已生成');
  }, [initWorld]);

  const resetPositions = React.useCallback(() => {
    const nextSeed = Math.floor(Math.random() * 1_000_000);
    setSeed(nextSeed);
    initWorld(null, paramsRef.current, nextSeed);
  }, [initWorld]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      initWorld(matrixRef.current, paramsRef.current, seed);
    };

    resize();
    window.addEventListener('resize', resize);

    const tick = (now: number) => {
      const state = stateRef.current;
      const ctx = canvas.getContext('2d');
      if (!state || !ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      state.params = { ...paramsRef.current };
      state.matrix = matrixRef.current;

      stepParticleLife(state);
      renderParticleLife(ctx, state, { trail });

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
    };
  }, [initWorld, seed, trail]);

  React.useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    syncParticleCount(state, params.particleCount);
  }, [params.particleCount]);

  const prevSpeciesCountRef = React.useRef(params.speciesCount);

  React.useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    remapSpecies(state, params.speciesCount);
  }, [params.speciesCount]);

  React.useEffect(() => {
    if (prevSpeciesCountRef.current === params.speciesCount) return;
    prevSpeciesCountRef.current = params.speciesCount;
    const rand = mulberry32(seed + params.speciesCount);
    const next = resizeMatrix(matrixRef.current, params.speciesCount, rand);
    setMatrix(next);
    matrixRef.current = next;
  }, [params.speciesCount, seed]);

  const patchParams = (partial: Partial<ParticleLifeParams>) => {
    setParams((p) => ({ ...p, ...partial }));
  };

  const setMatrixCell = (row: number, col: number, value: number) => {
    setPresetId('');
    setMatrix((m) => {
      const next = cloneMatrix(m);
      if (!next[row]) return m;
      next[row][col] = value;
      matrixRef.current = next;
      return next;
    });
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `particle-life-${seed}.png`, 'image/png');
        toast.success('快照已导出');
      }
    }, 'image/png');
  };

  const matrixCellColor = (value: number) => {
    if (value > 0) {
      const intensity = Math.min(1, value);
      return `color-mix(in oklch, var(--danger) ${Math.round(intensity * 85)}%, var(--surface-2))`;
    }
    if (value < 0) {
      const intensity = Math.min(1, -value);
      return `color-mix(in oklch, var(--primary) ${Math.round(intensity * 85)}%, var(--surface-2))`;
    }
    return 'var(--surface-2)';
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="primary" size="sm" onClick={randomizeWorld}>
            <Dices className="size-3.5" />
            随机世界
          </Button>
          <Button variant="secondary" size="sm" onClick={resetPositions}>
            <RefreshCw className="size-3.5" />
            重置位置
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
            导出 PNG
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {PARTICLE_LIFE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              title={preset.description}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                presetId === preset.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <Panel padded={false} bodyClassName="relative">
          <canvas
            ref={canvasRef}
            className="aspect-[4/3] w-full rounded-2xl"
            style={{ background: PARTICLE_LIFE_BACKGROUND }}
          />
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="absolute top-3 right-3 rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-xs backdrop-blur-sm"
          >
            {panelOpen ? '收起参数' : '参数'}
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
            <p className="text-center text-xs text-white/90">
              {params.particleCount.toLocaleString()} 粒子 · {params.speciesCount} 物种 ·{' '}
              {fps > 0 ? `${fps} FPS` : '计算中…'}
            </p>
          </div>
        </Panel>

        {panelOpen && (
          <>
            <Panel title="模拟参数" description="改动立即生效，无需点击应用">
              <div className="flex flex-col gap-3">
                <SliderRow
                  label="粒子数"
                  value={params.particleCount}
                  onChange={(v) => patchParams({ particleCount: v })}
                  min={2000}
                  max={15000}
                  step={500}
                />
                <SliderRow
                  label="物种数"
                  value={params.speciesCount}
                  onChange={(v) => patchParams({ speciesCount: v })}
                  min={2}
                  max={6}
                  step={1}
                />
                <SliderRow
                  label="交互半径"
                  value={Math.round(params.rMaxRatio * 1000)}
                  onChange={(v) => patchParams({ rMaxRatio: v / 1000 })}
                  min={40}
                  max={140}
                  step={5}
                />
                <SliderRow
                  label="力强度"
                  value={Math.round(params.forceScale * 100)}
                  onChange={(v) => patchParams({ forceScale: v / 100 })}
                  min={50}
                  max={200}
                  step={5}
                />
                <SwitchRow label="拖尾效果" checked={trail} onCheckedChange={setTrail} />
              </div>
            </Panel>

            <Panel
              title="交互矩阵"
              description="行 = 自身物种，列 = 邻域物种。红 = 吸引，蓝 = 排斥"
              actions={
                <Button variant="ghost" size="sm" onClick={randomizeWorld}>
                  <Sparkles className="size-3.5" />
                  随机
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <div
                  className="inline-grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${params.speciesCount + 1}, minmax(2.5rem, 1fr))`,
                  }}
                >
                  <div />
                  {Array.from({ length: params.speciesCount }, (_, col) => (
                    <div key={`h-${col}`} className="flex items-center justify-center">
                      <span
                        className="size-3 rounded-full"
                        style={{ background: SPECIES_COLORS[col % SPECIES_COLORS.length] }}
                      />
                    </div>
                  ))}
                  {matrix.slice(0, params.speciesCount).map((row, rowIdx) => (
                    <React.Fragment key={`row-${rowIdx}`}>
                      <div className="flex items-center justify-center">
                        <span
                          className="size-3 rounded-full"
                          style={{
                            background: SPECIES_COLORS[rowIdx % SPECIES_COLORS.length],
                          }}
                        />
                      </div>
                      {row.slice(0, params.speciesCount).map((cell, colIdx) => (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className="relative flex h-10 min-w-10 items-center justify-center rounded-lg border border-border text-[10px] font-medium"
                          style={{ background: matrixCellColor(cell) }}
                        >
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            step={5}
                            value={Math.round(cell * 100)}
                            onChange={(e) =>
                              setMatrixCell(rowIdx, colIdx, Number(e.target.value) / 100)
                            }
                            className="absolute inset-0 cursor-ew-resize opacity-0"
                            aria-label={`物种 ${rowIdx + 1} 对 ${colIdx + 1} 的交互强度`}
                          />
                          {cell === 0 ? '0' : cell.toFixed(1)}
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        )}

        <StatGrid
          columns={4}
          items={[
            { label: '粒子', value: params.particleCount.toLocaleString(), tone: 'primary' },
            { label: '物种', value: String(params.speciesCount) },
            { label: '帧率', value: fps > 0 ? `${fps}` : '—', tone: fps >= 30 ? 'success' : 'warning' },
            { label: '种子', value: String(seed) },
          ]}
        />
      </div>
    </ToolView>
  );
}
