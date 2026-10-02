/**
 * 马赛克图纸核心 —— 照片量化到有限色板，生成乐高 / 十字绣图纸与用料清单。
 * 在 CIE LAB 空间找最近色；纯函数，零 React 依赖。
 */

import { type RGB, readableTextColor, rgbToHex, relativeLuminance } from './color';
import { createCanvas } from './image';
import { DMC_PALETTE, LEGO_PALETTE, type RawPaletteEntry } from './mosaic-palettes';

export type MosaicPatternType = 'lego' | 'cross-stitch';

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export interface PaletteColor {
  id: string;
  name: string;
  rgb: RGB;
  hex: string;
  lab: Lab;
}

export interface MosaicOptions {
  type: MosaicPatternType;
  gridWidth: number;
  gridHeight: number;
  dither: boolean;
  /** 建议多买比例，如 10 表示 +10% */
  wastagePercent: number;
}

export interface MaterialCount {
  colorIndex: number;
  id: string;
  name: string;
  hex: string;
  count: number;
  countWithWastage: number;
  symbol: string;
}

export interface MosaicPattern {
  type: MosaicPatternType;
  width: number;
  height: number;
  /** 行优先，每格为 palette 下标 */
  cells: number[];
  palette: PaletteColor[];
  materials: MaterialCount[];
  totalCells: number;
  uniqueColors: number;
}

export interface RenderPatternOptions {
  cellSize: number;
  showLabels: boolean;
  /** 成品预览：降饱和 + 网格线 */
  previewMode: boolean;
}

export interface MosaicPreset {
  id: string;
  name: string;
  type: MosaicPatternType;
  width: number;
  height: number;
}

export const MOSAIC_PRESETS: MosaicPreset[] = [
  { id: 'lego-32', name: '乐高 32×32', type: 'lego', width: 32, height: 32 },
  { id: 'lego-48', name: '乐高 48×48', type: 'lego', width: 48, height: 48 },
  { id: 'lego-64', name: '乐高 64×64', type: 'lego', width: 64, height: 64 },
  { id: 'xs-50', name: '十字绣 50×70', type: 'cross-stitch', width: 50, height: 70 },
  { id: 'xs-80', name: '十字绣 80×100', type: 'cross-stitch', width: 80, height: 100 },
  { id: 'xs-100', name: '十字绣 100×140', type: 'cross-stitch', width: 100, height: 140 },
  { id: 'xs-150', name: '十字绣 150×200', type: 'cross-stitch', width: 150, height: 200 },
];

const CROSS_STITCH_SYMBOLS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+*#@&%$!?~'.split('');

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB → CIE LAB（D65 白点）。 */
export function rgbToLab({ r, g, b }: RGB): Lab {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);
  const x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  const z = lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041;
  const xn = 0.95047;
  const yn = 1;
  const zn = 1.08883;
  const fx = fLab(x / xn);
  const fy = fLab(y / yn);
  const fz = fLab(z / zn);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function fLab(t: number): number {
  const delta = 6 / 29;
  return t > delta ** 3 ? Math.cbrt(t) : t / (3 * delta ** 2) + 4 / 29;
}

function labDistance2(a: Lab, b: Lab): number {
  const dl = a.l - b.l;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dl * dl + da * da + db * db;
}

function buildPalette(raw: RawPaletteEntry[]): PaletteColor[] {
  const seen = new Set<string>();
  const out: PaletteColor[] = [];
  for (const entry of raw) {
    const key = entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: entry.id,
      name: entry.name,
      rgb: entry.rgb,
      hex: rgbToHex(entry.rgb),
      lab: rgbToLab(entry.rgb),
    });
  }
  return out;
}

const PALETTES: Record<MosaicPatternType, PaletteColor[]> = {
  lego: buildPalette(LEGO_PALETTE),
  'cross-stitch': buildPalette(DMC_PALETTE),
};

export function getPalette(type: MosaicPatternType): PaletteColor[] {
  return PALETTES[type];
}

export function findNearestColorIndex(rgb: RGB, palette: PaletteColor[]): number {
  const lab = rgbToLab(rgb);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const d = labDistance2(lab, palette[i].lab);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

function sampleImagePixels(
  image: HTMLImageElement,
  gridWidth: number,
  gridHeight: number,
): RGB[] {
  const canvas = createCanvas(gridWidth, gridHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, gridWidth, gridHeight);
  const { data } = ctx.getImageData(0, 0, gridWidth, gridHeight);
  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }
  return pixels;
}

function quantizeNearest(pixels: RGB[], palette: PaletteColor[]): number[] {
  return pixels.map((px) => findNearestColorIndex(px, palette));
}

function quantizeFloydSteinberg(
  pixels: RGB[],
  width: number,
  height: number,
  palette: PaletteColor[],
): number[] {
  const buffer = pixels.map((px) => ({ ...px }));
  const indices = new Array<number>(pixels.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const old = buffer[idx];
      const colorIndex = findNearestColorIndex(old, palette);
      indices[idx] = colorIndex;
      const mapped = palette[colorIndex].rgb;
      const er = old.r - mapped.r;
      const eg = old.g - mapped.g;
      const eb = old.b - mapped.b;

      const diffuse = (nx: number, ny: number, factor: number) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
        const t = buffer[ny * width + nx];
        t.r = clamp(Math.round(t.r + er * factor), 0, 255);
        t.g = clamp(Math.round(t.g + eg * factor), 0, 255);
        t.b = clamp(Math.round(t.b + eb * factor), 0, 255);
      };

      diffuse(x + 1, y, 7 / 16);
      diffuse(x - 1, y + 1, 3 / 16);
      diffuse(x, y + 1, 5 / 16);
      diffuse(x + 1, y + 1, 1 / 16);
    }
  }
  return indices;
}

function computeMaterials(
  cells: number[],
  palette: PaletteColor[],
  wastagePercent: number,
): MaterialCount[] {
  const counts = new Map<number, number>();
  for (const idx of cells) {
    counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }
  const factor = 1 + wastagePercent / 100;
  const materials: MaterialCount[] = [];
  for (const [colorIndex, count] of counts) {
    const color = palette[colorIndex];
    if (!color) continue;
    materials.push({
      colorIndex,
      id: color.id,
      name: color.name,
      hex: color.hex,
      count,
      countWithWastage: Math.ceil(count * factor),
      symbol: CROSS_STITCH_SYMBOLS[colorIndex % CROSS_STITCH_SYMBOLS.length] ?? '?',
    });
  }
  materials.sort((a, b) => b.count - a.count);
  return materials;
}

/** 从图片生成马赛克图纸。 */
export function generateMosaicPattern(
  image: HTMLImageElement,
  options: MosaicOptions,
): MosaicPattern {
  const width = clamp(Math.round(options.gridWidth), 8, 200);
  const height = clamp(Math.round(options.gridHeight), 8, 200);
  const palette = getPalette(options.type);
  const pixels = sampleImagePixels(image, width, height);
  const cells = options.dither
    ? quantizeFloydSteinberg(pixels, width, height, palette)
    : quantizeNearest(pixels, palette);
  const materials = computeMaterials(cells, palette, options.wastagePercent);

  return {
    type: options.type,
    width,
    height,
    cells,
    palette,
    materials,
    totalCells: width * height,
    uniqueColors: materials.length,
  };
}

export function computeGridHeight(
  image: HTMLImageElement,
  gridWidth: number,
  lockAspect = true,
): number {
  if (!lockAspect) return gridWidth;
  const ratio = image.naturalHeight / Math.max(1, image.naturalWidth);
  return clamp(Math.round(gridWidth * ratio), 8, 200);
}

function desaturateRgb({ r, g, b }: RGB, amount = 0.35): RGB {
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const t = 1 - amount;
  return {
    r: Math.round(r * t + gray * amount),
    g: Math.round(g * t + gray * amount),
    b: Math.round(b * t + gray * amount),
  };
}

/** 渲染图纸到 Canvas。 */
export function renderMosaicPattern(
  pattern: MosaicPattern,
  options: RenderPatternOptions,
): HTMLCanvasElement {
  const cell = Math.max(4, Math.round(options.cellSize));
  const canvas = createCanvas(pattern.width * cell, pattern.height * cell);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  for (let y = 0; y < pattern.height; y += 1) {
    for (let x = 0; x < pattern.width; x += 1) {
      const idx = pattern.cells[y * pattern.width + x];
      const color = pattern.palette[idx];
      if (!color) continue;
      const fill = options.previewMode ? desaturateRgb(color.rgb) : color.rgb;
      ctx.fillStyle = rgbToHex(fill);
      ctx.fillRect(x * cell, y * cell, cell, cell);

      if (options.showLabels && cell >= 10) {
        const label =
          pattern.type === 'cross-stitch'
            ? (pattern.materials.find((m) => m.colorIndex === idx)?.symbol ?? color.id)
            : color.id;
        const lum = relativeLuminance(fill);
        ctx.fillStyle = lum > 0.45 ? '#000000' : '#ffffff';
        const fontSize = Math.max(6, Math.min(11, Math.floor(cell * 0.42)));
        ctx.font = `600 ${fontSize}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x * cell + cell / 2, y * cell + cell / 2);
      }

      if (options.previewMode || cell >= 6) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
      }
    }
  }
  return canvas;
}

export function patternToDataUrl(
  pattern: MosaicPattern,
  options: RenderPatternOptions,
): string {
  return renderMosaicPattern(pattern, options).toDataURL('image/png');
}

export function exportMaterialsJson(pattern: MosaicPattern, wastagePercent: number): string {
  return JSON.stringify(
    {
      type: pattern.type,
      grid: { width: pattern.width, height: pattern.height },
      totalCells: pattern.totalCells,
      uniqueColors: pattern.uniqueColors,
      wastagePercent,
      materials: pattern.materials.map((m) => ({
        id: m.id,
        name: m.name,
        hex: m.hex,
        symbol: m.symbol,
        count: m.count,
        countWithWastage: m.countWithWastage,
        percentage: Math.round((m.count / pattern.totalCells) * 1000) / 10,
      })),
    },
    null,
    2,
  );
}

export function exportMaterialsCsv(pattern: MosaicPattern): string {
  const header = 'id,name,hex,symbol,count,count_with_wastage,percentage';
  const rows = pattern.materials.map((m) =>
    [
      m.id,
      `"${m.name.replace(/"/g, '""')}"`,
      m.hex,
      m.symbol,
      m.count,
      m.countWithWastage,
      (m.count / pattern.totalCells * 100).toFixed(1),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export function exportMaterialsText(pattern: MosaicPattern): string {
  const lines = pattern.materials.map(
    (m) =>
      `${m.id} · ${m.name}：${m.count} 格（建议购买 ${m.countWithWastage}）`,
  );
  return [
    `${pattern.type === 'lego' ? '乐高' : '十字绣'}图纸 ${pattern.width}×${pattern.height}`,
    `共 ${pattern.totalCells} 格，${pattern.uniqueColors} 种颜色`,
    '',
    ...lines,
  ].join('\n');
}

/** 对比用：原图缩略 Canvas。 */
export function renderSourcePreview(
  image: HTMLImageElement,
  maxSize = 480,
): HTMLCanvasElement {
  const ratio = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.round(image.naturalWidth * ratio);
  const h = Math.round(image.naturalHeight * ratio);
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(image, 0, 0, w, h);
  return canvas;
}

export function labelTextColor(hex: string): '#000000' | '#ffffff' {
  return readableTextColor(hex);
}
