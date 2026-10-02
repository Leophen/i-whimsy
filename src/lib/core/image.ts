/**
 * 图片处理核心库 —— 基于 Canvas / OffscreenCanvas，纯浏览器端。
 * 压缩、滤镜、水印、调色板提取、Base64 互转。
 */

import type { RGB } from './color';

export interface ImageMeta {
  width: number;
  height: number;
  size: number;
  type: string;
  name: string;
}

export type OutputMime = 'image/png' | 'image/jpeg' | 'image/webp';

/* ------------------------------------------------------------------ *
 * 压缩
 * ------------------------------------------------------------------ */

export interface CompressOptions {
  /** 质量 0 ~ 1，对 image/png 无效时由浏览器自行决定 */
  quality: number;
  /** 输出格式 */
  mime: OutputMime;
  /** 最大边长限制，0 表示不限 */
  maxDimension: number;
}

export interface CompressResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

/** 等比缩放到不超过 maxDimension。 */
export function fitDimension(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (maxDimension <= 0 || Math.max(width, height) <= maxDimension) return { width, height };
  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function compressImage(
  source: HTMLImageElement,
  opts: CompressOptions,
): Promise<CompressResult> {
  const { width, height } = fitDimension(
    source.naturalWidth,
    source.naturalHeight,
    opts.maxDimension,
  );
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, opts.mime, opts.quality);
  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width,
    height,
    size: blob.size,
  };
}

/* ------------------------------------------------------------------ *
 * 滤镜（Canvas 2D filter 字符串，GPU 加速）
 * ------------------------------------------------------------------ */

export interface FilterParams {
  brightness: number; // 100 = 原样
  contrast: number; // 100 = 原样
  saturate: number; // 100 = 原样
  hueRotate: number; // deg
  blur: number; // px
  grayscale: number; // 0 ~ 100
  sepia: number; // 0 ~ 100
  invert: number; // 0 ~ 100
  opacity: number; // 0 ~ 100
}

export const DEFAULT_FILTER_PARAMS: FilterParams = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  opacity: 100,
};

export function buildFilterString(p: FilterParams): string {
  const parts = [
    `brightness(${p.brightness}%)`,
    `contrast(${p.contrast}%)`,
    `saturate(${p.saturate}%)`,
    `hue-rotate(${p.hueRotate}deg)`,
    `opacity(${p.opacity}%)`,
  ];
  if (p.blur > 0) parts.push(`blur(${p.blur}px)`);
  if (p.grayscale > 0) parts.push(`grayscale(${p.grayscale}%)`);
  if (p.sepia > 0) parts.push(`sepia(${p.sepia}%)`);
  if (p.invert > 0) parts.push(`invert(${p.invert}%)`);
  return parts.join(' ');
}

export function isFilterDefault(p: FilterParams): boolean {
  return JSON.stringify(p) === JSON.stringify(DEFAULT_FILTER_PARAMS);
}

export const FILTER_PRESETS: { name: string; params: Partial<FilterParams> }[] = [
  { name: '原图', params: {} },
  { name: '复古', params: { sepia: 45, contrast: 110, saturate: 85 } },
  { name: '黑白', params: { grayscale: 100, contrast: 105 } },
  { name: '冷调', params: { hueRotate: 25, saturate: 115 } },
  { name: '暖调', params: { hueRotate: -20, saturate: 110 } },
  { name: '高对比', params: { contrast: 145, saturate: 115 } },
  { name: '褪色', params: { saturate: 40, brightness: 112, contrast: 90 } },
  { name: '胶片', params: { sepia: 25, contrast: 125, saturate: 95, brightness: 96 } },
  { name: '反相', params: { invert: 100 } },
];

export async function applyFilter(
  source: HTMLImageElement,
  params: FilterParams,
  mime: OutputMime = 'image/png',
  quality = 0.92,
): Promise<CompressResult> {
  const canvas = createCanvas(source.naturalWidth, source.naturalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.filter = buildFilterString(params);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToBlob(canvas, mime, quality);
  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
  };
}

/* ------------------------------------------------------------------ *
 * 水印（45° 斜向平铺，源自旧版 iWhimsy 的自研算法，重写为纯函数）
 * ------------------------------------------------------------------ */

export interface WatermarkParams {
  text: string;
  color: string;
  fontSize: number;
  opacity: number; // 0 ~ 100
  /** 平铺间距倍数，越大越疏 */
  spacing: number;
  rotation: number; // deg，默认 -22.5（接近传统 45° 视觉效果且更易读）
  fontFamily: string;
  bold: boolean;
  /** 单个水印居中图中央（用于版权署名），为 false 时全图平铺 */
  single: boolean;
}

export const DEFAULT_WATERMARK: WatermarkParams = {
  text: 'iWhimsy',
  color: '#ffffff',
  fontSize: 24,
  opacity: 30,
  spacing: 1.8,
  rotation: -22.5,
  fontFamily: 'sans-serif',
  bold: true,
  single: false,
};

/** 在给定 canvas 上绘制水印（不负责画底图，便于组合）。 */
export function drawWatermark(canvas: HTMLCanvasElement, params: WatermarkParams): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !params.text) return;

  const font = `${params.bold ? '700 ' : ''}${params.fontSize}px ${params.fontFamily}`;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = params.color;
  ctx.globalAlpha = params.opacity / 100;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (params.single) {
    const metrics = ctx.measureText(params.text);
    const w = metrics.width;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((params.rotation * Math.PI) / 180);
    ctx.fillText(params.text, -w / 2, params.fontSize / 2);
    ctx.restore();
    return;
  }

  const rad = (params.rotation * Math.PI) / 180;
  ctx.rotate(rad);

  // 旋转后为了覆盖整个画布，需要在对角线范围内铺设
  const diag = Math.hypot(canvas.width, canvas.height);
  const textWidth = ctx.measureText(params.text).width;
  const stepX = textWidth + params.fontSize * params.spacing;
  const stepY = params.fontSize * (params.spacing + 1.4);

  const startX = -diag / 2;
  const endX = diag / 2 + stepX;
  const startY = -diag / 2;
  const endY = diag / 2 + stepY;

  for (let y = startY; y < endY; y += stepY) {
    for (let x = startX; x < endX; x += stepX) {
      ctx.fillText(params.text, x + canvas.width / 2, y + canvas.height / 2);
    }
  }
  ctx.restore();
}

export async function addWatermark(
  source: HTMLImageElement,
  params: WatermarkParams,
  mime: OutputMime = 'image/png',
  quality = 0.92,
): Promise<CompressResult> {
  const canvas = createCanvas(source.naturalWidth, source.naturalHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(source, 0, 0);
  drawWatermark(canvas, params);
  const blob = await canvasToBlob(canvas, mime, quality);
  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: canvas.width,
    height: canvas.height,
    size: blob.size,
  };
}

/* ------------------------------------------------------------------ *
 * 调色板提取：中位切分（median cut）量化，比单次主色更有实用价值
 * ------------------------------------------------------------------ */

export interface PaletteSwatch {
  rgb: RGB;
  hex: string;
  /** 该簇像素占比 */
  ratio: number;
}

/** 采样步长，值越大越快但越不精确。 */
export function extractPalette(
  source: HTMLImageElement,
  colorCount = 8,
  sampleStep = 4,
): PaletteSwatch[] {
  const maxSide = 220;
  const ratio = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
  const w = Math.max(1, Math.round(source.naturalWidth * ratio));
  const h = Math.max(1, Math.round(source.naturalHeight * ratio));

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(source, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return []; // 跨域图片会抛 SecurityError
  }

  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i] as number;
    const g = data[i + 1] as number;
    const b = data[i + 2] as number;
    const a = data[i + 3] as number;
    if (a < 125) continue; // 忽略透明像素
    pixels.push({ r, g, b });
  }
  if (pixels.length === 0) return [];

  const clusters = medianCut(pixels, Math.min(colorCount, 16));
  const total = pixels.length;

  return clusters
    .map((cluster) => {
      const avg = averageColor(cluster);
      return {
        rgb: avg,
        hex: rgbToHexShort(avg),
        ratio: cluster.length / total,
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

interface Cluster {
  pixels: RGB[];
  ranges: [number, number, number];
}

function channelExtent(pixels: RGB[]): Cluster {
  let rMin = 255;
  let rMax = 0;
  let gMin = 255;
  let gMax = 0;
  let bMin = 255;
  let bMax = 0;
  for (const p of pixels) {
    if (p.r < rMin) rMin = p.r;
    if (p.r > rMax) rMax = p.r;
    if (p.g < gMin) gMin = p.g;
    if (p.g > gMax) gMax = p.g;
    if (p.b < bMin) bMin = p.b;
    if (p.b > bMax) bMax = p.b;
  }
  return {
    pixels,
    ranges: [rMax - rMin, gMax - gMin, bMax - bMin],
  };
}

function medianCut(pixels: RGB[], maxColors: number): RGB[][] {
  let clusters: Cluster[] = [channelExtent(pixels)];

  while (clusters.length < maxColors) {
    // 选像素数最多且仍有色域跨度的簇继续切
    let target = -1;
    let bestVolume = -1;
    for (let i = 0; i < clusters.length; i += 1) {
      const c = clusters[i] as Cluster;
      const volume = Math.max(...c.ranges);
      if (c.pixels.length <= 1 || volume === 0) continue;
      const score = volume * Math.log(c.pixels.length + 1);
      if (score > bestVolume) {
        bestVolume = score;
        target = i;
      }
    }
    if (target === -1) break;

    const c = clusters[target] as Cluster;
    const axis = c.ranges.indexOf(Math.max(...c.ranges)) as 0 | 1 | 2;
    const key: (keyof RGB)[] = ['r', 'g', 'b'];
    const prop = key[axis];
    const sorted = [...c.pixels].sort((a, b) => a[prop] - b[prop]);
    const mid = Math.floor(sorted.length / 2);
    const left = sorted.slice(0, mid);
    const right = sorted.slice(mid);
    if (left.length === 0 || right.length === 0) break;
    clusters = [...clusters.slice(0, target), ...clusters.slice(target + 1)];
    clusters.push(channelExtent(left), channelExtent(right));
  }

  return clusters.map((c) => c.pixels);
}

function averageColor(pixels: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of pixels) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  const n = pixels.length || 1;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

const rgbToHexShort = ({ r, g, b }: RGB): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/** 取出现最多的单一主色。 */
export function dominantColor(source: HTMLImageElement): string | null {
  const palette = extractPalette(source, 1, 6);
  return palette[0]?.hex ?? null;
}

/* ------------------------------------------------------------------ *
 * 底层工具
 * ------------------------------------------------------------------ */

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: OutputMime,
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('导出图片失败'))),
      mime,
      quality,
    );
  });
}

export function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败，请检查文件是否损坏'));
    img.src = src;
  });
}

/** canvas → Blob（按指定区域裁剪）。 */
export async function cropImageToBlob(
  source: HTMLImageElement,
  area: { x: number; y: number; width: number; height: number },
  mime: OutputMime = 'image/png',
  quality = 0.92,
): Promise<CompressResult> {
  const canvas = createCanvas(area.width, area.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  const blob = await canvasToBlob(canvas, mime, quality);
  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: area.width,
    height: area.height,
    size: blob.size,
  };
}
