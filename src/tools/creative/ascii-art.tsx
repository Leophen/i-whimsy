'use client';

import * as React from 'react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { FileDropzone, readImageFile, type LoadedImageMeta } from '@/components/tool/file-dropzone';
import { loadImageFromSrc } from '@/lib/core/image';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * 字符集：按「视觉密度」从暗到亮排列
 * ------------------------------------------------------------------ */
const CHARSETS: { value: string; label: string; chars: string }[] = [
  { value: 'standard', label: '标准', chars: '@%#*+=-:. ' },
  {
    value: 'dense',
    label: '密集',
    chars: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
  },
  { value: 'block', label: '方块', chars: '█▓▒░ ' },
  { value: 'dot', label: '点阵', chars: '●◍◎○· ' },
  { value: 'binary', label: '01', chars: '10 ' },
  { value: 'minimal', label: '极简', chars: '#. ' },
];

/** ASCII 字符的高宽比约为 0.5，采样时纵向要压缩一半才不变形 */
const ASPECT = 0.5;

export interface AsciiRow {
  text: string;
  /** 每个字符对应的颜色（#rrggbb），纯文本模式为空 */
  colors: string[];
}

export interface AsciiResult {
  rows: AsciiRow[];
  width: number;
  height: number;
}

/** 把亮度映射到字符集下标；chars 按「暗 → 亮」排列，所以亮像素取后面的字符 */
function charFor(luma: number, chars: string): string {
  const idx = Math.min(
    chars.length - 1,
    Math.max(0, Math.round((luma / 255) * (chars.length - 1))),
  );
  return chars[idx] ?? ' ';
}

/** 量化颜色，减少彩色输出里 span 的数量 */
function quantize(r: number, g: number, b: number): string {
  const q = (n: number) => Math.round(n / 24) * 24;
  return `#${[q(r), q(g), q(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** 应用对比度（以 128 为中点做线性拉伸） */
function applyContrast(v: number, contrast: number): number {
  const c = contrast / 100;
  return Math.min(255, Math.max(0, 128 + (v - 128) * c));
}

export function renderAscii(
  img: HTMLImageElement,
  opts: { width: number; charset: string; contrast: number; invert: boolean; color: boolean },
): AsciiResult {
  const { width, charset, contrast, invert, color } = opts;
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const sampledH = Math.max(1, Math.round(((width * srcH) / srcW) * ASPECT));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = sampledH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { rows: [], width, height: sampledH };

  ctx.drawImage(img, 0, 0, width, sampledH);
  const data = ctx.getImageData(0, 0, width, sampledH).data;

  const rows: AsciiRow[] = [];
  for (let y = 0; y < sampledH; y += 1) {
    let text = '';
    const colors: string[] = [];
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]! / 255;
      // 透明像素按白底合成
      const rc = r * a + 255 * (1 - a);
      const gc = g * a + 255 * (1 - a);
      const bc = b * a + 255 * (1 - a);

      let luma = 0.2126 * rc + 0.7152 * gc + 0.0722 * bc;
      luma = applyContrast(luma, contrast);
      if (invert) luma = 255 - luma;

      text += charFor(luma, charset);
      if (color) colors.push(quantize(r, g, b));
    }
    rows.push({ text, colors });
  }

  return { rows, width, height: sampledH };
}

/** 纯文本输出 */
function toPlainText(result: AsciiResult): string {
  return result.rows.map((r) => r.text).join('\n');
}

/** 彩色 HTML 输出：把连续同色的字符合并成一个 span */
function toColoredHtml(result: AsciiResult): string {
  const body = result.rows
    .map((row) => {
      if (row.colors.length === 0) return escapeHtml(row.text);
      let html = '';
      let run = '';
      let runColor = row.colors[0] ?? '#000000';
      for (let i = 0; i < row.text.length; i += 1) {
        const c = row.colors[i] ?? runColor;
        if (c === runColor) {
          run += row.text[i];
        } else {
          html += `<span style="color:${runColor}">${escapeHtml(run)}</span>`;
          run = row.text[i] ?? '';
          runColor = c;
        }
      }
      if (run) html += `<span style="color:${runColor}">${escapeHtml(run)}</span>`;
      return html;
    })
    .join('\n');

  return `<pre style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1;letter-spacing:0">\n${body}\n</pre>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ------------------------------------------------------------------ *
 * 组件
 * ------------------------------------------------------------------ */
export default function AsciiArt() {
  const tool = useToolMeta('ascii-art');
  useTrackRecent(tool.slug);

  const [image, setImage] = React.useState<LoadedImageMeta | null>(null);
  const [width, setWidth] = React.useState(100);
  const [charsetId, setCharsetId] = React.useState('standard');
  const [contrast, setContrast] = React.useState(100);
  const [invert, setInvert] = React.useState(false);
  const [colorMode, setColorMode] = React.useState<'plain' | 'color'>('plain');
  const [busy, setBusy] = React.useState(false);
  const [imgEl, setImgEl] = React.useState<HTMLImageElement | null>(null);

  const charset = CHARSETS.find((c) => c.value === charsetId)?.chars ?? CHARSETS[0]!.chars;

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const meta = await readImageFile(file);
      setImage(meta);
      const el = await loadImageFromSrc(meta.url);
      setImgEl(el);
    } finally {
      setBusy(false);
    }
  };

  // 采样画布最大只有 180 宽，渲染是纯同步计算，直接派生即可，不需要 effect
  const result = React.useMemo(
    () =>
      imgEl
        ? renderAscii(imgEl, { width, charset, contrast, invert, color: colorMode === 'color' })
        : null,
    [imgEl, width, charset, contrast, invert, colorMode],
  );

  const plain = result ? toPlainText(result) : '';
  const html = result ? toColoredHtml(result) : '';
  const output = colorMode === 'color' ? html : plain;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <DownloadButton
            data={plain || null}
            filename="ascii-art.txt"
            mimeType="text/plain"
            sourceLabel="字符画"
            variant="secondary"
          >
            下载 TXT
          </DownloadButton>
          <CopyButton value={output} sourceLabel={colorMode === 'color' ? 'HTML 代码' : '字符画'}>
            复制
          </CopyButton>
        </>
      }
    >
      {!image ? (
        <Panel title="选择图片" description="支持 PNG / JPG / WebP，图片越大细节越丰富">
          <FileDropzone accept="image/*" onFile={handleFile} />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <Panel title="图片与参数">
            <FileDropzone
              accept="image/*"
              onFile={handleFile}
              current={{ name: image.name, size: image.size, url: image.url }}
              onRemove={() => {
                setImage(null);
                setImgEl(null);
              }}
            />

            <div className="mt-4 space-y-3.5">
              <SliderRow
                label="输出宽度"
                value={width}
                onChange={setWidth}
                min={30}
                max={180}
                step={5}
                suffix=" 字符"
              />
              <SliderRow
                label="对比度"
                value={contrast}
                onChange={setContrast}
                min={20}
                max={300}
                suffix=" %"
              />
              <SwitchRow
                label="反色"
                description="浅色图片建议开启"
                checked={invert}
                onCheckedChange={setInvert}
              />

              <div>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  输出模式
                </span>
                <SegmentedControl
                  size="sm"
                  full
                  value={colorMode}
                  onValueChange={setColorMode}
                  options={[
                    { value: 'plain', label: '纯文本' },
                    { value: 'color', label: '彩色 HTML' },
                  ]}
                  className="mt-1.5"
                />
              </div>

              <div>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  字符集
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {CHARSETS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCharsetId(c.value)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                        charsetId === c.value
                          ? 'border-primary/50 bg-primary-subtle text-primary'
                          : 'border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-3.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>原图</span>
                <span className="tabular">
                  {image.width} × {image.height}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>字符矩阵</span>
                <span className="tabular">
                  {result ? `${result.width} × ${result.height}` : '—'}
                </span>
              </div>
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel
              title="效果预览"
              description={
                colorMode === 'color' ? '彩色模式按原图取色渲染' : '纯文本模式可直接复制粘贴'
              }
              actions={
                <CopyButton value={output} sourceLabel="字符画" size="xs" disabled={!output}>
                  复制
                </CopyButton>
              }
            >
              {busy || !result ? (
                <div className="h-64 animate-pulse rounded-xl bg-surface-2" />
              ) : (
                <div className="scrollbar-none max-h-[32rem] overflow-auto rounded-xl border border-border bg-background p-4">
                  {colorMode === 'color' ? (
                    <div
                      className="inline-block font-mono text-[9px] leading-[1] tracking-normal whitespace-pre"
                      style={{ fontSize: width > 130 ? '6px' : width > 90 ? '8px' : '10px' }}
                    >
                      {result.rows.map((row, y) => (
                        <div key={y}>{renderColoredRow(row)}</div>
                      ))}
                    </div>
                  ) : (
                    <pre
                      className="inline-block font-mono leading-[1.05] whitespace-pre"
                      style={{ fontSize: width > 130 ? '6px' : width > 90 ? '8px' : '10px' }}
                    >
                      {plain}
                    </pre>
                  )}
                </div>
              )}

              {result && (
                <div className="mt-3">
                  <StatGrid
                    columns={4}
                    items={[
                      {
                        label: '字符行列',
                        value: `${result.width}×${result.height}`,
                        tone: 'primary',
                      },
                      { label: '总字符数', value: result.width * result.height },
                      {
                        label: '字符集',
                        value: CHARSETS.find((c) => c.value === charsetId)?.label ?? '—',
                      },
                      {
                        label: '输出体积',
                        value: `${Math.round((output.length / 1024) * 10) / 10} KB`,
                      },
                    ]}
                  />
                </div>
              )}
            </Panel>

            {!result && (
              <Panel>
                <EmptyState title="还没有生成字符画" description="选择一张图片后会自动生成" />
              </Panel>
            )}
          </div>
        </div>
      )}
    </ToolView>
  );
}

/** 把一行字符按连续同色合并成 span，避免逐字符渲染出上万个节点 */
function renderColoredRow(row: AsciiRow): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  if (row.colors.length === 0) return [row.text];

  let run = '';
  let runColor = row.colors[0] ?? '#000000';
  let key = 0;

  const flush = () => {
    if (!run) return;
    out.push(
      <span key={(key += 1)} style={{ color: runColor }}>
        {run}
      </span>,
    );
    run = '';
  };

  for (let i = 0; i < row.text.length; i += 1) {
    const c = row.colors[i] ?? runColor;
    if (c === runColor) run += row.text[i];
    else {
      flush();
      run = row.text[i] ?? '';
      runColor = c;
    }
  }
  flush();
  return out;
}
