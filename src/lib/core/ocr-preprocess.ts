/**
 * OCR 图像预处理 —— 灰度、对比度拉伸、二值化、缩放。
 * Tesseract 对分辨率与对比度敏感，海报/彩色底图不经预处理识别率很低。
 */

export interface OcrPreprocessConfig {
  /** 短边低于此值时等比放大 */
  minShortSide?: number;
  /** 长边超过此值时等比缩小 */
  maxLongSide?: number;
  /** 对比度拉伸 */
  contrast?: boolean;
  /** 二值化（适合高对比印刷体、彩色海报） */
  binarize?: boolean;
}

export const DEFAULT_OCR_PREPROCESS: OcrPreprocessConfig = {
  minShortSide: 1200,
  maxLongSide: 2800,
  contrast: true,
  binarize: false,
};

export function preprocessBitmapForOcr(
  source: ImageBitmap,
  config: OcrPreprocessConfig = {},
): OffscreenCanvas {
  const opts = { ...DEFAULT_OCR_PREPROCESS, ...config };
  let w = source.width;
  let h = source.height;

  const shortSide = Math.min(w, h);

  if (opts.minShortSide && shortSide < opts.minShortSide) {
    const scale = opts.minShortSide / shortSide;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  if (opts.maxLongSide && Math.max(w, h) > opts.maxLongSide) {
    const scale = opts.maxLongSide / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建 OCR 预处理画布');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const { data } = imageData;
  const pixels = w * h;
  const gray = new Uint8Array(pixels);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = Math.round(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!);
  }

  if (opts.contrast) {
    let min = 255;
    let max = 0;
    for (const g of gray) {
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < pixels; i++) {
      gray[i] = Math.round(((gray[i]! - min) / range) * 255);
    }
  }

  if (opts.binarize) {
    const threshold = otsuThreshold(gray);
    for (let i = 0; i < pixels; i++) {
      gray[i] = gray[i]! >= threshold ? 255 : 0;
    }
  }

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = gray[p]!;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Otsu 自适应阈值。 */
function otsuThreshold(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (const g of gray) hist[g]!++;

  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i]!;

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}
