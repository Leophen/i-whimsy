'use client';

import * as React from 'react';
import { Download, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { StatGrid } from '@/components/tool/bits';
import { downloadFile } from '@/lib/core/browser';
import { Panel, Notice } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl } from '@/components/ui/controls';
import { useCanvasResize, useVisibilityPause } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  addGrains,
  createSandpile,
  renderSandpile,
  SANDPILE_PALETTE_LABELS,
  SANDPILE_PALETTES,
  type SandpileState,
} from '@/lib/core/sandpile';

const GRAIN_PRESETS = [
  { value: 50_000, label: '5 万' },
  { value: 200_000, label: '20 万' },
  { value: 500_000, label: '50 万' },
];

export default function Sandpile() {
  const tool = useToolMeta('sandpile');
  useTrackRecent(tool.slug);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const stateRef = React.useRef<SandpileState>(createSandpile(512));
  const rafRef = React.useRef<number>(0);

  const [paletteId, setPaletteId] = React.useState('mandala');
  const [targetGrains, setTargetGrains] = React.useState(200_000);
  const [dropped, setDropped] = React.useState(0);
  const [avalanches, setAvalanches] = React.useState(0);
  const [growing, setGrowing] = React.useState(true);
  const droppedRef = React.useRef(0);
  const targetRef = React.useRef(targetGrains);
  const visible = useVisibilityPause();

  React.useEffect(() => {
    droppedRef.current = dropped;
    targetRef.current = targetGrains;
  }, [dropped, targetGrains]);

  const palette = SANDPILE_PALETTES[paletteId] ?? SANDPILE_PALETTES.mandala;

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = Math.min(canvas.clientWidth, canvas.clientHeight);
    if (size <= 0) return;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const imageData = renderSandpile(state, palette, size);
    ctx.putImageData(imageData, 0, 0);
  }, [palette]);

  useCanvasResize(canvasRef, () => draw());

  const reset = React.useCallback(() => {
    stateRef.current = createSandpile(512);
    setDropped(0);
    setAvalanches(0);
    setGrowing(true);
    draw();
  }, [draw]);

  React.useEffect(() => {
    draw();
  }, [palette, draw]);

  React.useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  React.useEffect(() => {
    if (!growing || !visible) return;
    const tick = () => {
      const state = stateRef.current;
      const target = targetRef.current;
      if (!state || state.dropped >= target) {
        setGrowing(false);
        return;
      }
      const batch = Math.min(800, target - state.dropped);
      addGrains(state, batch);
      setDropped(state.dropped);
      setAvalanches(state.avalancheCount);
      draw();
      if (state.dropped >= target) {
        setGrowing(false);
        toast.success('生长完成，可以导出了');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [growing, visible, draw]);

  const handleExport = async () => {
    const state = stateRef.current;
    if (!state) return;
    const exportSize = 2048;
    const imageData = renderSandpile(state, palette, exportSize);
    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        downloadFile(blob, `sandpile-${paletteId}.png`, 'image/png');
        toast.success('高清图已导出');
      }
    }, 'image/png');
  };

  const paletteOptions = Object.keys(SANDPILE_PALETTES).map((id) => ({
    value: id,
    label: SANDPILE_PALETTE_LABELS[id] ?? id,
  }));

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={reset}>
            <RefreshCw className="size-3.5" />
            重新生长
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={dropped < 1000}>
            <Download className="size-3.5" />
            导出 2048px
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            value={String(targetGrains)}
            onValueChange={(v) => {
              setTargetGrains(Number(v));
              reset();
            }}
            options={GRAIN_PRESETS.map((p) => ({ value: String(p.value), label: p.label }))}
          />
          <SegmentedControl
            value={paletteId}
            onValueChange={(v) => setPaletteId(v)}
            options={paletteOptions}
          />
        </div>

        <Panel padded={false} bodyClassName="relative aspect-square max-h-[min(72vh,720px)] w-full">
          <canvas
            ref={canvasRef}
            className="size-full rounded-2xl"
            style={{ background: palette.background }}
          />
          {growing && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-4">
              <p className="text-center text-xs text-white/90">
                落沙中… {dropped.toLocaleString()} / {targetGrains.toLocaleString()}
                {avalanches > 0 && ` · 雪崩 ${avalanches.toLocaleString()} 次`}
              </p>
            </div>
          )}
        </Panel>

        <StatGrid
          columns={4}
          items={[
            { label: '已落沙', value: dropped.toLocaleString(), tone: 'primary' },
            { label: '目标', value: targetGrains.toLocaleString() },
            { label: '雪崩次数', value: avalanches.toLocaleString(), tone: 'warning' },
            {
              label: '状态',
              value: growing ? '生长中' : '已完成',
              tone: growing ? 'primary' : 'success',
            },
          ]}
        />

        {!growing && (
          <Notice tone="success" icon={<Sparkles />}>
            分形曼陀罗已稳定。50 万粒沙可导出 A3 海报（2048px），适合打印装饰。
          </Notice>
        )}
      </div>
    </ToolView>
  );
}
