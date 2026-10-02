'use client';

import * as React from 'react';
import { Download, Link2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { CopyButton } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import {
  createNoise2D,
  createParticles,
  decodeFlowHash,
  DEFAULT_FLOW_PARAMS,
  encodeFlowHash,
  fieldAngle,
  FLOW_PALETTES,
  mulberry32,
  type FlowArtParams,
  type FlowParticle,
} from '@/lib/core/flow-field';
import { useCanvasResize, useHydrated } from '@/lib/hooks';

export default function FlowArt() {
  const tool = useToolMeta('flow-art');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const particlesRef = React.useRef<FlowParticle[]>([]);
  const mouseRef = React.useRef({ x: -1, y: -1, active: false });
  const rafRef = React.useRef(0);

  const [params, setParams] = React.useState<FlowArtParams>(DEFAULT_FLOW_PARAMS);
  const [paletteId, setPaletteId] = React.useState('aurora');

  const hashAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydrated || hashAppliedRef.current) return;
    hashAppliedRef.current = true;
    const decoded = decodeFlowHash(window.location.hash);
    requestAnimationFrame(() => {
      if (Object.keys(decoded.params).length) {
        setParams({ ...DEFAULT_FLOW_PARAMS, ...decoded.params });
      }
      if (decoded.paletteId) setPaletteId(decoded.paletteId);
    });
  }, [hydrated]);
  const [panelOpen, setPanelOpen] = React.useState(false);

  const palette = FLOW_PALETTES.find((p) => p.id === paletteId) ?? FLOW_PALETTES[0];
  const canvasSizeRef = React.useRef({ w: 0, h: 0 });

  useCanvasResize(canvasRef, (w, h) => {
    canvasSizeRef.current = { w, h };
  });

  const newSeed = React.useCallback(() => {
    setParams((p) => ({ ...p, seed: Math.floor(Math.random() * 1_000_000) }));
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width === 0 || canvas.height === 0) {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr) || canvasSizeRef.current.w;
      canvas.height = Math.round(rect.height * dpr) || canvasSizeRef.current.h;
    }

    const rand = mulberry32(params.seed);
    particlesRef.current = createParticles(
      canvas.width,
      canvas.height,
      params.particleCount,
      palette,
      rand,
    );

    const noise = createNoise2D(params.seed);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const step = () => {
      const { width, height } = canvas;
      ctx.fillStyle = `rgba(0,0,0,${params.trailOpacity})`;
      ctx.fillRect(0, 0, width, height);

      for (const p of particlesRef.current) {
        const angle = fieldAngle(noise, p.x, p.y, params.noiseScale, params.noiseStrength);
        let ax = 0;
        let ay = 0;
        if (mouseRef.current.active) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            const force = (1 - dist / 120) * 2;
            ax = (dx / dist) * force;
            ay = (dy / dist) * force;
          }
        }
        const vx = Math.cos(angle) * params.speed + ax;
        const vy = Math.sin(angle) * params.speed + ay;
        const nx = p.x + vx;
        const ny = p.y + vy;

        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = params.lineWidth;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        ctx.globalAlpha = 1;

        p.x = nx;
        p.y = ny;
        p.life -= 1;

        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height || p.life <= 0) {
          p.x = rand() * width;
          p.y = rand() * height;
          p.life = params.maxLife;
          p.color = palette.colors[Math.floor(rand() * palette.colors.length)] as string;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [params, palette, hydrated]);

  const shareUrl = React.useMemo(() => {
    if (!hydrated) return '';
    const hash = encodeFlowHash(params, paletteId);
    return `${window.location.origin}${window.location.pathname}${hash}`;
  }, [hydrated, params, paletteId]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `flow-art-${params.seed}.png`, 'image/png');
        toast.success('壁纸已导出');
      }
    }, 'image/png');
  };

  const patch = (partial: Partial<FlowArtParams>) => setParams((p) => ({ ...p, ...partial }));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={newSeed}>
            <RefreshCw className="size-3.5" />
            换种子
          </Button>
          <CopyButton value={shareUrl} silent={false} sourceLabel="分享链接">
            <Link2 className="size-3.5" />
            分享
          </CopyButton>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="size-3.5" />
            导出 PNG
          </Button>
        </>
      }
    >
      <div className="relative flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {FLOW_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaletteId(p.id)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                paletteId === p.id
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border bg-surface hover:border-border-strong'
              }`}
            >
              <span className="flex gap-0.5">
                {p.colors.slice(0, 4).map((c) => (
                  <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>

        <Panel padded={false} bodyClassName="relative">
          <canvas
            ref={canvasRef}
            className="aspect-[4/3] w-full cursor-crosshair touch-none rounded-2xl"
            style={{ background: palette.background }}
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const dpr = window.devicePixelRatio || 1;
              mouseRef.current = {
                x: (e.clientX - rect.left) * dpr,
                y: (e.clientY - rect.top) * dpr,
                active: true,
              };
            }}
            onPointerLeave={() => {
              mouseRef.current.active = false;
            }}
          />
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="absolute top-3 right-3 rounded-lg border border-border bg-surface/80 px-2.5 py-1 text-xs backdrop-blur-sm"
          >
            {panelOpen ? '收起参数' : '参数'}
          </button>
        </Panel>

        {panelOpen && (
          <Panel title="流场参数">
            <div className="flex flex-col gap-3">
              <SliderRow
                label="粒子数"
                value={params.particleCount}
                onChange={(v) => patch({ particleCount: v })}
                min={1000}
                max={12000}
                step={500}
              />
              <SliderRow
                label="拖尾长度"
                value={Math.round(params.trailOpacity * 1000)}
                onChange={(v) => patch({ trailOpacity: v / 1000 })}
                min={5}
                max={50}
                step={1}
              />
              <SliderRow
                label="噪声尺度"
                value={Math.round(params.noiseScale * 10000)}
                onChange={(v) => patch({ noiseScale: v / 10000 })}
                min={5}
                max={30}
                step={1}
              />
            </div>
          </Panel>
        )}
      </div>
    </ToolView>
  );
}
