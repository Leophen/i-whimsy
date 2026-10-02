'use client';

import * as React from 'react';
import { Play } from 'lucide-react';

import { CopyButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SliderRow } from '@/components/ui/controls';
import { EASING_PRESETS, bezierSolveT, bezierY, sampleBezier } from '@/lib/core/css';
import { cn } from '@/lib/utils';

/** 画布尺寸（控制点坐标系 0~1，y 轴向上为正） */
const W = 320;
const H = 320;
const PAD = 40; // 画布四周留白，给超出 0~1 的控制点留位置

const toX = (x: number) => PAD + x * (W - PAD * 2);
const toY = (y: number) => H - PAD - y * (H - PAD * 2);
/** 把鼠标坐标转回 0~1 空间，允许控制点略微越界（回弹曲线需要 y > 1） */
const fromX = (px: number) => (px - PAD) / (W - PAD * 2);
const fromY = (py: number) => (H - PAD - py) / (H - PAD * 2);

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function CubicBezier() {
  const tool = useToolMeta('cubic-bezier');
  useTrackRecent(tool.slug);

  const [x1, setX1] = React.useState(0.34);
  const [y1, setY1] = React.useState(1.56);
  const [x2, setX2] = React.useState(0.64);
  const [y2, setY2] = React.useState(1);
  const [duration, setDuration] = React.useState(1200);
  const [playKey, setPlayKey] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const dragging = React.useRef<1 | 2 | null>(null);
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const fn = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  const samples = React.useMemo(() => sampleBezier(x1, y1, x2, y2, 80), [x1, y1, x2, y2]);
  const curvePath = React.useMemo(
    () =>
      samples
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.x).toFixed(2)} ${toY(p.y).toFixed(2)}`)
        .join(' '),
    [samples],
  );

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    if (dragging.current === 1) {
      setX1(clamp(fromX(px), 0, 1));
      setY1(clamp(fromY(py), -0.5, 2));
    } else {
      setX2(clamp(fromX(px), 0, 1));
      setY2(clamp(fromY(py), -0.5, 2));
    }
  };

  const applyPreset = ([a, b, c, d]: [number, number, number, number]) => {
    setX1(a);
    setY1(b);
    setX2(c);
    setY2(d);
    setPlayKey((k) => k + 1);
  };

  return (
    <ToolView
      tool={tool}
      actions={
        <CopyButton value={fn} sourceLabel="缓动函数" variant="secondary">
          复制函数
        </CopyButton>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="控制点" description="拖动圆点或直接输入数值">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none select-none rounded-xl border border-border bg-background"
            onPointerMove={handlePointer}
            onPointerUp={() => (dragging.current = null)}
            onPointerLeave={() => (dragging.current = null)}
            role="img"
            aria-label="贝塞尔曲线编辑区"
          >
            <defs>
              <pattern id="bz-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path
                  d="M24 0H0V24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-border"
                />
              </pattern>
            </defs>
            <rect x={0} y={0} width={W} height={H} fill="url(#bz-grid)" />

            {/* 0~1 有效区域 */}
            <rect
              x={toX(0)}
              y={toY(1)}
              width={W - PAD * 2}
              height={H - PAD * 2}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="text-border-strong"
            />

            {/* 控制柄 */}
            <line
              x1={toX(0)}
              y1={toY(0)}
              x2={toX(x1)}
              y2={toY(y1)}
              stroke="var(--color-primary)"
              strokeWidth="1.5"
            />
            <line
              x1={toX(1)}
              y1={toY(1)}
              x2={toX(x2)}
              y2={toY(y2)}
              stroke="var(--color-primary)"
              strokeWidth="1.5"
            />

            {/* 曲线 */}
            <path
              d={curvePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {(
              [
                [x1, y1, 1],
                [x2, y2, 2],
              ] as const
            ).map(([px, py, idx]) => (
              <circle
                key={idx}
                cx={toX(px)}
                cy={toY(py)}
                r={9}
                fill="var(--color-primary)"
                stroke="white"
                strokeWidth="2"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  dragging.current = idx;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
              />
            ))}
          </svg>

          <div className="mt-4 space-y-3">
            <SliderRow label="x1" value={x1} onChange={setX1} min={0} max={1} step={0.01} />
            <SliderRow label="y1" value={y1} onChange={setY1} min={-0.5} max={2} step={0.01} />
            <SliderRow label="x2" value={x2} onChange={setX2} min={0} max={1} step={0.01} />
            <SliderRow label="y2" value={y2} onChange={setY2} min={-0.5} max={2} step={0.01} />
            <SliderRow
              label="预览时长"
              value={duration}
              onChange={setDuration}
              min={200}
              max={4000}
              step={100}
              suffix=" ms"
            />
          </div>

          <div className="mt-4 border-t border-border pt-3.5">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              预设
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EASING_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p.value)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    x1 === p.value[0] && y1 === p.value[1] && x2 === p.value[2] && y2 === p.value[3]
                      ? 'border-primary/50 bg-primary-subtle text-primary'
                      : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title="动画预览"
            description="点播放看小球的实际运动节奏"
            actions={
              <button
                type="button"
                onClick={() => setPlayKey((k) => k + 1)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Play className="size-3" />
                播放
              </button>
            }
          >
            <div className="relative h-24 overflow-hidden rounded-xl border border-border bg-surface-2">
              <Ball
                key={playKey}
                duration={duration}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                onEnd={() => setPlaying(false)}
                onStart={() => setPlaying(true)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                进度对照
              </span>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-muted-foreground/50"
                    style={{
                      width: `${Math.round(bezierY(y1, y2, bezierSolveT(x1, x2, 0.5)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="tabular text-[11px] text-muted-foreground">
                  时间过半 → 进度 {Math.round(bezierY(y1, y2, bezierSolveT(x1, x2, 0.5)) * 100)}%
                </span>
              </div>
            </div>

            <div className="mt-3">
              <StatGrid
                columns={3}
                items={[
                  { label: 'CSS', value: fn, tone: 'primary' },
                  { label: '状态', value: playing ? '播放中' : '就绪' },
                  { label: '时长', value: `${duration}ms` },
                ]}
              />
            </div>
          </Panel>

          <Panel
            title="CSS 代码"
            actions={
              <CopyButton
                value={`transition-timing-function: ${fn};\n/* 或 */\nanimation-timing-function: ${fn};`}
                sourceLabel="CSS"
                size="xs"
              >
                复制
              </CopyButton>
            }
          >
            <pre className="overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">{`transition-timing-function: ${fn};

/* 等价的 transition 简写 */
transition: all ${duration}ms ${fn};`}</pre>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              cubic-bezier 的两个控制点固定为 (0, 0) 和 (1, 1)，只有中间两个点可调。 y 值超出 0~1
              会先冲过终点再回弹，用来做 overshoot 效果。
            </p>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}

/** 用 requestAnimationFrame 按缓动函数推进小球，避免依赖 CSS 动画的时序差异 */
function Ball({
  duration,
  x1,
  y1,
  x2,
  y2,
  onStart,
  onEnd,
}: {
  duration: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  onStart: () => void;
  onEnd: () => void;
}) {
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    onStart();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setT(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else onEnd();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const progress = bezierY(y1, y2, bezierSolveT(x1, x2, t));

  return (
    <div
      className="absolute top-1/2 size-8 -translate-y-1/2 rounded-full bg-primary shadow-md"
      style={{ left: `calc(${progress * 100}% - ${progress * 32}px)` }}
    />
  );
}
