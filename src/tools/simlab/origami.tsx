'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Eraser, Mountain, Waves } from 'lucide-react';
import { toast } from 'sonner';

import { DownloadButton, ResetButton } from '@/components/tool/bits';
import { Panel, ToolIO, Notice } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import {
  clonePattern,
  createCreaseId,
  createEmptyPattern,
  exportCreaseSvg,
  ORIGAMI_PRESETS,
  PAPER_SIZES,
  renderCreasePattern,
  screenToPaper,
  snapToGrid,
  clampToPaper,
  type CreasePattern,
  type CreaseType,
  type PaperSizeKey,
  type Vec2,
} from '@/lib/core/origami';

const OrigamiPreview = dynamic(() => import('./origami-preview'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-surface-2 text-sm text-muted-foreground">
      加载 3D 引擎…
    </div>
  ),
});

type DrawMode = CreaseType | 'erase';

const CANVAS_PADDING = 24;
const GRID_MM = 5;

export default function Origami() {
  const tool = useToolMeta('origami');
  useTrackRecent(tool.slug);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [pattern, setPattern] = React.useState<CreasePattern>(() =>
    ORIGAMI_PRESETS[0].create(200),
  );
  const [activePreset, setActivePreset] = React.useState('waterbomb');
  const [paperKey, setPaperKey] = React.useState<PaperSizeKey>('square20');
  const [drawMode, setDrawMode] = React.useState<DrawMode>('valley');
  const [foldProgress, setFoldProgress] = React.useState(0);
  const [snapGrid, setSnapGrid] = React.useState(true);
  const [showNumbers, setShowNumbers] = React.useState(true);
  const [draftFrom, setDraftFrom] = React.useState<Vec2 | null>(null);
  const [draftTo, setDraftTo] = React.useState<Vec2 | null>(null);

  const paper = PAPER_SIZES[paperKey];

  React.useEffect(() => {
    let raf = 0;
    const tick = () => {
      setFoldProgress((p) => (p >= 100 ? 0 : p + 0.5));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [activePreset, paperKey]);

  const svgBlob = React.useMemo(
    () => new Blob([exportCreaseSvg(pattern, { showNumbers })], { type: 'image/svg+xml' }),
    [pattern, showNumbers],
  );

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
    renderCreasePattern(ctx, pattern, {
      padding: CANVAS_PADDING,
      draftFrom,
      draftTo,
    });
  }, [pattern, draftFrom, draftTo]);

  React.useEffect(() => {
    redraw();
  }, [redraw]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(redraw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  const loadPreset = (presetId: string) => {
    const preset = ORIGAMI_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const size = Math.min(paper.width, paper.height);
    setPattern(preset.create(size));
    setActivePreset(presetId);
    setFoldProgress(0);
    setDraftFrom(null);
    setDraftTo(null);
    toast.success(`已加载「${preset.name}」`);
  };

  const resetPattern = () => {
    const size = Math.min(paper.width, paper.height);
    setPattern(createEmptyPattern(size));
    setActivePreset('');
    setFoldProgress(0);
    setDraftFrom(null);
    setDraftTo(null);
  };

  const handlePaperChange = (key: PaperSizeKey) => {
    setPaperKey(key);
    const size = Math.min(PAPER_SIZES[key].width, PAPER_SIZES[key].height);
    setPattern((prev) => ({
      ...clonePattern(prev),
      paperWidth: size,
      paperHeight: size,
    }));
  };

  const pointerToPaper = (clientX: number, clientY: number): Vec2 | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    let p = screenToPaper(sx, sy, rect.width, rect.height, pattern, CANVAS_PADDING);
    if (snapGrid) p = snapToGrid(p, GRID_MM);
    p = clampToPaper(p, pattern.paperWidth, pattern.paperHeight);
    if (p.x < 0 || p.y < 0 || p.x > pattern.paperWidth || p.y > pattern.paperHeight) return null;
    return p;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pointerToPaper(e.clientX, e.clientY);
    if (!p) return;

    if (drawMode === 'erase') {
      const hit = findNearestCrease(p, pattern, 8);
      if (hit) {
        setPattern((prev) => ({
          ...prev,
          creases: prev.creases.filter((c) => c.id !== hit),
        }));
      }
      return;
    }

    setDraftFrom(p);
    setDraftTo(p);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draftFrom) return;
    const p = pointerToPaper(e.clientX, e.clientY);
    if (p) setDraftTo(p);
  };

  const handlePointerUp = () => {
    if (!draftFrom || !draftTo) {
      setDraftFrom(null);
      setDraftTo(null);
      return;
    }
    const dist = Math.hypot(draftTo.x - draftFrom.x, draftTo.y - draftFrom.y);
    if (dist < 3) {
      setDraftFrom(null);
      setDraftTo(null);
      return;
    }

    if (drawMode === 'mountain' || drawMode === 'valley') {
      const maxOrder = pattern.creases.reduce((m, c) => Math.max(m, c.foldOrder), -1);
      setPattern((prev) => ({
        ...prev,
        name: '自定义折痕图',
        creases: [
          ...prev.creases,
          {
            id: createCreaseId(),
            a: { ...draftFrom },
            b: { ...draftTo },
            type: drawMode,
            foldOrder: maxOrder + 1,
          },
        ],
      }));
      setActivePreset('');
    }

    setDraftFrom(null);
    setDraftTo(null);
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <DownloadButton
          data={svgBlob}
          filename={`${pattern.name}-折痕图.svg`}
          mimeType="image/svg+xml"
          sourceLabel="折痕图"
        >
          导出折痕 SVG
        </DownloadButton>
      }
    >
      <Notice tone="info">
        红色实线 = 山折，蓝色虚线 = 谷折。折叠为视觉插值预览，非严格物理求解。
        导出 SVG 标注了实际纸张尺寸（mm），可直接打印。
      </Notice>

      <Panel title="经典折痕图" description="点选加载内置图样，再拖动下方折叠进度">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ORIGAMI_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => loadPreset(preset.id)}
              className={`group flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                activePreset === preset.id
                  ? 'border-primary bg-primary-subtle'
                  : 'border-border bg-surface hover:border-primary/40'
              }`}
            >
              <div
                className="aspect-square w-full bg-white p-2 [&_svg]:size-full [&_svg]:object-contain"
                aria-hidden
                dangerouslySetInnerHTML={{
                  __html: exportCreaseSvg(preset.create(200), {
                    showNumbers: false,
                    lineWidth: 0.5,
                    marginMm: 4,
                  }),
                }}
              />
              <div className="px-3 py-2">
                <p className="text-[13px] font-medium">{preset.name}</p>
                <p className="mt-0.5 line-clamp-2 break-words text-[11px] text-muted-foreground">
                  {preset.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <SliderRow
        label="折叠进度"
        value={foldProgress}
        onChange={setFoldProgress}
        min={0}
        max={100}
        suffix="%"
      />

      <ToolIO
        split="even"
        input={
          <Panel
            title="折痕图编辑"
            description="在纸上拖线绘制折痕"
            actions={<ResetButton onReset={resetPattern} />}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SegmentedControl
                value={drawMode}
                onValueChange={(v) => setDrawMode(v as DrawMode)}
                options={[
                  { value: 'valley', label: '谷折', icon: <Waves className="size-3.5" /> },
                  { value: 'mountain', label: '山折', icon: <Mountain className="size-3.5" /> },
                  { value: 'erase', label: '擦除', icon: <Eraser className="size-3.5" /> },
                ]}
              />
              <SegmentedControl
                value={paperKey}
                onValueChange={(v) => handlePaperChange(v as PaperSizeKey)}
                options={[
                  { value: 'square20', label: '200mm' },
                  { value: 'square15', label: '150mm' },
                  { value: 'A4', label: 'A4' },
                ]}
              />
            </div>

            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5 bg-danger" /> 山折（红实线）
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0 w-5 border-t-2 border-dashed border-primary"
                />
                谷折（蓝虚线）
              </span>
            </div>

            <SwitchRow label="对齐网格 (5 mm)" checked={snapGrid} onCheckedChange={setSnapGrid} />
            <SwitchRow
              label="导出时显示折痕编号"
              checked={showNumbers}
              onCheckedChange={setShowNumbers}
            />

            <canvas
              ref={canvasRef}
              className="mt-3 w-full cursor-crosshair rounded-xl border border-border bg-surface-2 touch-none"
              style={{ height: 360 }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />

            <p className="mt-2 text-[11px] text-muted-foreground">
              纸张 {pattern.paperWidth} × {pattern.paperHeight} mm · {pattern.creases.length}{' '}
              条折痕 · {paper.label}
            </p>
          </Panel>
        }
        output={
          <Panel title="三维折叠预览" description="拖动进度滑杆查看折叠过程">
            <OrigamiPreview pattern={pattern} progress={foldProgress} className="rounded-xl border border-border" />
          </Panel>
        }
      />
    </ToolView>
  );
}

function findNearestCrease(
  p: Vec2,
  pattern: CreasePattern,
  thresholdMm: number,
): string | null {
  let bestId: string | null = null;
  let bestDist = thresholdMm;

  for (const crease of pattern.creases) {
    const d = pointToSegmentDistance(p, crease.a, crease.b);
    if (d < bestDist) {
      bestDist = d;
      bestId = crease.id;
    }
  }
  return bestId;
}

function pointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}
