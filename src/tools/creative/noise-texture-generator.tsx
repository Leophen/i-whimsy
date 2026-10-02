'use client';

import * as React from 'react';
import { Shuffle } from 'lucide-react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { cn } from '@/lib/utils';

type Pattern = 'grain' | 'grid' | 'dots' | 'lines' | 'diagonal';

const PATTERNS: { value: Pattern; label: string }[] = [
  { value: 'grain', label: '颗粒噪点' },
  { value: 'grid', label: '网格' },
  { value: 'dots', label: '点阵' },
  { value: 'lines', label: '横线' },
  { value: 'diagonal', label: '斜纹' },
];

/** 浅色 / 深色两套配色预设，切换时同步底色与图案色 */
const SHADE: Record<'light' | 'dark', { label: string; bg: string; color: string }> = {
  light: { label: '浅色底', bg: '#ffffff', color: '#000000' },
  dark: { label: '深色底', bg: '#0b1020', color: '#ffffff' },
};

export default function NoiseTextureGenerator() {
  const tool = useToolMeta('noise-texture-generator');
  useTrackRecent(tool.slug);

  const [pattern, setPattern] = React.useState<Pattern>('grain');
  const [size, setSize] = React.useState(600);
  const [density, setDensity] = React.useState(70);
  const [intensity, setIntensity] = React.useState(45);
  const [grain, setGrain] = React.useState(2);
  const [color, setColor] = React.useState('#000000');
  const [bg, setBg] = React.useState('#ffffff');
  const [shade, setShade] = React.useState<'light' | 'dark'>('light');
  const [seed, setSeed] = React.useState(() => Math.floor(Math.random() * 100000));
  const [dataUrl, setDataUrl] = React.useState('');
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  /** 确定性伪随机（mulberry32），同一 seed 出同一张图，方便复现 */
  const makeRandom = React.useCallback((s: number) => {
    let a = s >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;
    const rand = makeRandom(seed);
    const alpha = intensity / 100;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    if (pattern === 'grain') {
      // 颗粒：逐像素画块，密度决定覆盖比例，grain 决定颗粒大小
      const cell = Math.max(1, grain);
      const count = Math.floor(((size / cell) * (size / cell) * density) / 100);
      for (let i = 0; i < count; i += 1) {
        const x = Math.floor(rand() * (size / cell)) * cell;
        const y = Math.floor(rand() * (size / cell)) * cell;
        ctx.globalAlpha = alpha * (0.35 + rand() * 0.65);
        ctx.fillRect(x, y, cell, cell);
      }
    } else if (pattern === 'grid') {
      const step = Math.max(4, Math.round(60 - density * 0.45));
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.5, grain / 2);
      for (let x = 0; x <= size; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      for (let y = 0; y <= size; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    } else if (pattern === 'dots') {
      const step = Math.max(4, Math.round(40 - density * 0.3));
      const r = Math.max(0.6, (grain / 2) * (step / 20));
      ctx.globalAlpha = alpha;
      for (let x = step / 2; x <= size; x += step) {
        for (let y = step / 2; y <= size; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'lines') {
      const step = Math.max(2, Math.round(30 - density * 0.26));
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.5, grain / 2);
      for (let y = 0; y <= size; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
    } else {
      const step = Math.max(3, Math.round(28 - density * 0.22));
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.5, grain / 2);
      for (let i = -size; i <= size * 2; i += step) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + size, size);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    setDataUrl(canvas.toDataURL('image/png'));
  }, [pattern, size, density, intensity, grain, color, bg, seed, makeRandom]);

  const cssSnippet = dataUrl
    ? `.noise {\n  background-image: url("${dataUrl}");\n  background-repeat: repeat;\n}`
    : '';

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <button
            type="button"
            onClick={() => setSeed(Math.floor(Math.random() * 100000))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <Shuffle className="size-3.5" />
            换一张
          </button>
          <DownloadButton
            data={dataUrl ? dataUrlToBlob(dataUrl) : null}
            filename={`texture-${pattern}-${size}.png`}
            mimeType="image/png"
            sourceLabel="纹理图"
            variant="secondary"
          >
            下载 PNG
          </DownloadButton>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="参数">
          <div className="space-y-3.5">
            <div>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                图案
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PATTERNS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPattern(p.value)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                      pattern === p.value
                        ? 'border-primary/50 bg-primary-subtle text-primary'
                        : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <SliderRow
              label="画布尺寸"
              value={size}
              onChange={setSize}
              min={200}
              max={1600}
              step={50}
              suffix=" px"
            />
            <SliderRow
              label="密度"
              value={density}
              onChange={setDensity}
              min={1}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="强度"
              value={intensity}
              onChange={setIntensity}
              min={1}
              max={100}
              suffix=" %"
            />
            <SliderRow
              label="粗细 / 颗粒"
              value={grain}
              onChange={setGrain}
              min={1}
              max={8}
              step={0.5}
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                图案色
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="图案颜色"
                  className="h-8 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                底色
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  aria-label="底色"
                  className="h-8 w-12 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
              </label>
            </div>

            <SegmentedControl
              size="sm"
              full
              value={shade}
              onValueChange={(v) => {
                setShade(v);
                setBg(SHADE[v].bg);
                setColor(SHADE[v].color);
              }}
              options={[
                { value: 'light', label: SHADE.light.label },
                { value: 'dark', label: SHADE.dark.label },
              ]}
            />
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="实时预览" description="纹理在 Canvas 本地生成，不上传任何数据">
            <div className="grid place-items-center rounded-xl border border-border bg-surface-2 p-4">
              <canvas
                ref={canvasRef}
                className="max-w-full rounded-lg shadow-sm"
                style={{ width: Math.min(size, 420), height: Math.min(size, 420) }}
                aria-label="纹理预览"
              />
            </div>
            <div className="mt-3">
              <StatGrid
                columns={4}
                items={[
                  {
                    label: '图案',
                    value: PATTERNS.find((x) => x.value === pattern)?.label ?? pattern,
                    tone: 'primary',
                  },
                  { label: '尺寸', value: `${size}²` },
                  { label: '随机种子', value: seed },
                  {
                    label: 'PNG 大小',
                    value: dataUrl ? `${Math.round((dataUrl.length * 0.75) / 1024)} KB` : '—',
                  },
                ]}
              />
            </div>
          </Panel>

          <Panel
            title="CSS 用法"
            actions={
              <CopyButton value={cssSnippet} sourceLabel="CSS" size="xs" disabled={!dataUrl}>
                复制
              </CopyButton>
            }
          >
            <pre className="scrollbar-none max-h-40 overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[11px] leading-relaxed break-all">
              {cssSnippet || '生成中…'}
            </pre>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              颗粒噪点常用作大面积质感底图，建议把强度压到 20% 以下再叠加
              <code className="font-mono"> mix-blend-mode: overlay</code>
              ；网格与点阵更适合做技术风背景。
            </p>
          </Panel>
        </div>
      </div>
    </ToolView>
  );
}

/** data URL → Blob，供下载使用 */
function dataUrlToBlob(dataUrl: string): Blob | null {
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const mime = /:(.*?);/.exec(parts[0]!)?.[1] ?? 'image/png';
  const binary = atob(parts[1]!);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) buf[i] = binary.charCodeAt(i);
  return new Blob([buf], { type: mime });
}
