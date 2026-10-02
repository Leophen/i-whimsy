/**
 * 图像修复与增强 —— 纯函数算法层（mask 裁切、分块超分、Lab 上色合并）。
 */

export type RestoreMode = 'inpaint' | 'upscale' | 'colorize';

export const RESTORE_MODELS = {
  inpaint: {
    id: 'lama',
    label: '去物体',
    sizeLabel: '208MB',
    url: 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama.onnx',
  },
  upscale: {
    id: 'esrgan',
    label: '放大',
    sizeLabel: '5MB',
    url: 'https://huggingface.co/second-state/Real-ESRGAN-general-x4v3/resolve/main/realesr-general-x4v3.onnx',
  },
  colorize: {
    id: 'ddcolor',
    label: '上色',
    sizeLabel: '180MB',
    url: 'https://huggingface.co/onnx-community/DDColor/resolve/main/model.onnx',
  },
} as const;

export const ESRGAN_TILE_SIZE = 128;
export const ESRGAN_TILE_OVERLAP = 16;
export const ESRGAN_SCALE = 4;
export const LAMA_SIZE = 512;
export const MAX_UPSCALE_LONG_EDGE = 2048;
export const MAX_UPSCALE_4X_PIXELS = 4_000_000;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LamaPatch {
  image: Float32Array;
  mask: Float32Array;
  region: Rect;
  scaleX: number;
  scaleY: number;
}

export interface UpscaleTile {
  inputX: number;
  inputY: number;
  inputW: number;
  inputH: number;
  outputX: number;
  outputY: number;
}

/* ------------------------------------------------------------------ *
 * Lab 色彩空间（DDColor 合并用）
 * ------------------------------------------------------------------ */

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const sr = r / 255;
  const sg = g / 255;
  const sb = b / 255;
  const lr = sr > 0.04045 ? Math.pow((sr + 0.055) / 1.055, 2.4) : sr / 12.92;
  const lg = sg > 0.04045 ? Math.pow((sg + 0.055) / 1.055, 2.4) : sg / 12.92;
  const lb = sb > 0.04045 ? Math.pow((sb + 0.055) / 1.055, 2.4) : sb / 12.92;
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883;
  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const x =
    (fx ** 3 > 0.008856 ? fx ** 3 : (fx - 16 / 116) / 7.787) * 0.95047;
  const y = fy ** 3 > 0.008856 ? fy ** 3 : (fy - 16 / 116) / 7.787;
  const z =
    (fz ** 3 > 0.008856 ? fz ** 3 : (fz - 16 / 116) / 7.787) * 1.08883;
  const lr = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const lg = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  const lb = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  const toByte = (v: number) =>
    Math.round(Math.min(255, Math.max(0, (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255)));
  return [toByte(lr), toByte(lg), toByte(lb)];
}

/** 保留原图 L 通道，采用模型预测的 ab 色度。 */
export function mergeLabColorization(
  original: Uint8ClampedArray,
  colorized: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(original.length);
  for (let i = 0; i < original.length; i += 4) {
    const [L] = rgbToLab(original[i]!, original[i + 1]!, original[i + 2]!);
    const [, a, b] = rgbToLab(colorized[i]!, colorized[i + 1]!, colorized[i + 2]!);
    const [r, g, bl] = labToRgb(L, a, b);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = bl;
    out[i + 3] = original[i + 3] ?? 255;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * LaMa：mask 裁切 + 512 定长输入
 * ------------------------------------------------------------------ */

/** 读取 mask 像素值，兼容 RGBA（canvas getImageData）与单通道格式。 */
export function maskAlphaAt(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const idx = y * width + x;
  if (mask.length === width * height * 4) {
    return mask[idx * 4]!;
  }
  return mask[idx]!;
}

export function findMaskBounds(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  padding = 32,
): Rect | null {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maskAlphaAt(mask, width, height, x, y) > 20) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!found) return null;

  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const w = Math.min(width - x, maxX - minX + 1 + padding * 2);
  const h = Math.min(height - y, maxY - minY + 1 + padding * 2);
  return { x, y, width: w, height: h };
}

function sampleBilinear(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  channel: number,
): number {
  const cx = Math.min(width - 1, Math.max(0, x));
  const cy = Math.min(height - 1, Math.max(0, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fx = cx - x0;
  const fy = cy - y0;
  const idx = (px: number, py: number) => (py * width + px) * 4 + channel;
  const v00 = data[idx(x0, y0)]!;
  const v10 = data[idx(x1, y0)]!;
  const v01 = data[idx(x0, y1)]!;
  const v11 = data[idx(x1, y1)]!;
  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

export function prepareLamaPatch(
  image: Uint8ClampedArray,
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  region: Rect,
): LamaPatch {
  const imageTensor = new Float32Array(3 * LAMA_SIZE * LAMA_SIZE);
  const maskTensor = new Float32Array(LAMA_SIZE * LAMA_SIZE);

  for (let y = 0; y < LAMA_SIZE; y++) {
    for (let x = 0; x < LAMA_SIZE; x++) {
      const sx = region.x + (x / LAMA_SIZE) * region.width;
      const sy = region.y + (y / LAMA_SIZE) * region.height;
      const r = sampleBilinear(image, width, height, sx, sy, 0);
      const g = sampleBilinear(image, width, height, sx, sy, 1);
      const b = sampleBilinear(image, width, height, sx, sy, 2);
      const m = sampleBilinear(mask, width, height, sx, sy, 0);

      const base = y * LAMA_SIZE + x;
      imageTensor[base] = r / 255;
      imageTensor[LAMA_SIZE * LAMA_SIZE + base] = g / 255;
      imageTensor[2 * LAMA_SIZE * LAMA_SIZE + base] = b / 255;
      maskTensor[base] = m > 127 ? 1 : 0;
    }
  }

  return {
    image: imageTensor,
    mask: maskTensor,
    region,
    scaleX: region.width / LAMA_SIZE,
    scaleY: region.height / LAMA_SIZE,
  };
}

/** 将 512×512 推理结果贴回原图，mask 边缘羽化融合。 */
export function pasteLamaResult(
  base: Uint8ClampedArray,
  width: number,
  height: number,
  patchRgb: Float32Array,
  region: Rect,
  fullMask: Uint8ClampedArray,
  featherPx = 12,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(base);
  const { x: rx, y: ry, width: rw, height: rh } = region;

  for (let py = 0; py < rh; py++) {
    for (let px = 0; px < rw; px++) {
      const gx = rx + px;
      const gy = ry + py;
      if (gx >= width || gy >= height) continue;

      const lx = (px / rw) * LAMA_SIZE;
      const ly = (py / rh) * LAMA_SIZE;
      const x0 = Math.floor(lx);
      const y0 = Math.floor(ly);
      const x1 = Math.min(LAMA_SIZE - 1, x0 + 1);
      const y1 = Math.min(LAMA_SIZE - 1, y0 + 1);
      const fx = lx - x0;
      const fy = ly - y0;

      const sample = (cx: number, cy: number, c: number) => {
        const idx = cy * LAMA_SIZE + cx;
        return patchRgb[c * LAMA_SIZE * LAMA_SIZE + idx]!;
      };

      const r =
        sample(x0, y0, 0) * (1 - fx) * (1 - fy) +
        sample(x1, y0, 0) * fx * (1 - fy) +
        sample(x0, y1, 0) * (1 - fx) * fy +
        sample(x1, y1, 0) * fx * fy;
      const g =
        sample(x0, y0, 1) * (1 - fx) * (1 - fy) +
        sample(x1, y0, 1) * fx * (1 - fy) +
        sample(x0, y1, 1) * (1 - fx) * fy +
        sample(x1, y1, 1) * fx * fy;
      const b =
        sample(x0, y0, 2) * (1 - fx) * (1 - fy) +
        sample(x1, y0, 2) * fx * (1 - fy) +
        sample(x0, y1, 2) * (1 - fx) * fy +
        sample(x1, y1, 2) * fx * fy;

      const maskVal = maskAlphaAt(fullMask, width, height, gx, gy) / 255;
      if (maskVal <= 0) continue;

      const edgeDist = distanceToMaskEdge(fullMask, width, height, gx, gy, featherPx);
      const alpha = Math.min(1, maskVal * edgeDist);

      const o = (gy * width + gx) * 4;
      out[o] = Math.round(out[o]! * (1 - alpha) + r * 255 * alpha);
      out[o + 1] = Math.round(out[o + 1]! * (1 - alpha) + g * 255 * alpha);
      out[o + 2] = Math.round(out[o + 2]! * (1 - alpha) + b * 255 * alpha);
    }
  }

  return out;
}

function distanceToMaskEdge(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  maxDist: number,
): number {
  if (maskAlphaAt(mask, width, height, cx, cy) <= 20) return 0;
  let minEdge = maxDist;
  for (let dy = -maxDist; dy <= maxDist; dy++) {
    for (let dx = -maxDist; dx <= maxDist; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) {
        minEdge = Math.min(minEdge, Math.hypot(dx, dy));
        continue;
      }
      if (maskAlphaAt(mask, width, height, x, y) <= 20) {
        minEdge = Math.min(minEdge, Math.hypot(dx, dy));
      }
    }
  }
  return Math.min(1, minEdge / maxDist);
}

/* ------------------------------------------------------------------ *
 * Real-ESRGAN 分块计划
 * ------------------------------------------------------------------ */

export function buildUpscaleTiles(inputW: number, inputH: number): UpscaleTile[] {
  const tiles: UpscaleTile[] = [];
  const stride = ESRGAN_TILE_SIZE - ESRGAN_TILE_OVERLAP;

  for (let y = 0; y < inputH; y += stride) {
    for (let x = 0; x < inputW; x += stride) {
      const inputWTile = Math.min(ESRGAN_TILE_SIZE, inputW - x);
      const inputHTile = Math.min(ESRGAN_TILE_SIZE, inputH - y);
      tiles.push({
        inputX: x,
        inputY: y,
        inputW: inputWTile,
        inputH: inputHTile,
        outputX: x * ESRGAN_SCALE,
        outputY: y * ESRGAN_SCALE,
      });
    }
  }

  return tiles;
}

export function extractTileTensor(
  rgba: Uint8ClampedArray,
  imageW: number,
  imageH: number,
  tile: UpscaleTile,
): { tensor: Float32Array; padW: number; padH: number } {
  const padW = ESRGAN_TILE_SIZE;
  const padH = ESRGAN_TILE_SIZE;
  const tensor = new Float32Array(3 * padW * padH);

  for (let y = 0; y < padH; y++) {
    for (let x = 0; x < padW; x++) {
      const sx = Math.min(imageW - 1, tile.inputX + x);
      const sy = Math.min(imageH - 1, tile.inputY + y);
      const si = (sy * imageW + sx) * 4;
      const ti = y * padW + x;
      tensor[ti] = rgba[si]! / 255;
      tensor[padW * padH + ti] = rgba[si + 1]! / 255;
      tensor[2 * padW * padH + ti] = rgba[si + 2]! / 255;
    }
  }

  return { tensor, padW, padH };
}

export function blendUpscaleTile(
  output: Float32Array,
  outW: number,
  outH: number,
  tile: UpscaleTile,
  tileRgb: Float32Array,
  tileW: number,
  tileH: number,
): void {
  const outTileW = tile.inputW * ESRGAN_SCALE;
  const outTileH = tile.inputH * ESRGAN_SCALE;

  for (let y = 0; y < outTileH; y++) {
    for (let x = 0; x < outTileW; x++) {
      const ox = tile.outputX + x;
      const oy = tile.outputY + y;
      if (ox >= outW || oy >= outH) continue;

      const srcX = Math.floor((x / outTileW) * tileW);
      const srcY = Math.floor((y / outTileH) * tileH);
      const si = srcY * tileW + srcX;
      const oi = oy * outW + ox;

      const wx =
        x < ESRGAN_TILE_OVERLAP * ESRGAN_SCALE
          ? x / (ESRGAN_TILE_OVERLAP * ESRGAN_SCALE)
          : x >= outTileW - ESRGAN_TILE_OVERLAP * ESRGAN_SCALE
            ? (outTileW - x) / (ESRGAN_TILE_OVERLAP * ESRGAN_SCALE)
            : 1;
      const wy =
        y < ESRGAN_TILE_OVERLAP * ESRGAN_SCALE
          ? y / (ESRGAN_TILE_OVERLAP * ESRGAN_SCALE)
          : y >= outTileH - ESRGAN_TILE_OVERLAP * ESRGAN_SCALE
            ? (outTileH - y) / (ESRGAN_TILE_OVERLAP * ESRGAN_SCALE)
            : 1;
      const w = Math.min(1, Math.max(0, wx * wy));

      const r = tileRgb[si]!;
      const g = tileRgb[tileW * tileH + si]!;
      const b = tileRgb[2 * tileW * tileH + si]!;

      const base = oi * 4;
      output[base] = output[base]! * (1 - w) + r * 255 * w;
      output[base + 1] = output[base + 1]! * (1 - w) + g * 255 * w;
      output[base + 2] = output[base + 2]! * (1 - w) + b * 255 * w;
      output[base + 3] = 255;
    }
  }
}

export function floatRgbToRgba(buffer: Float32Array, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4);
  const plane = width * height;
  for (let i = 0; i < plane; i++) {
    const o = i * 4;
    out[o] = Math.round(Math.min(255, Math.max(0, buffer[i]! * 255)));
    out[o + 1] = Math.round(Math.min(255, Math.max(0, buffer[plane + i]! * 255)));
    out[o + 2] = Math.round(Math.min(255, Math.max(0, buffer[2 * plane + i]! * 255)));
    out[o + 3] = 255;
  }
  return out;
}

export function rgbaToGrayscale(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const gray = Math.round(rgba[i]! * 0.299 + rgba[i + 1]! * 0.587 + rgba[i + 2]! * 0.114);
    out[i] = gray;
    out[i + 1] = gray;
    out[i + 2] = gray;
    out[i + 3] = rgba[i + 3] ?? 255;
  }
  return out;
}

export function prepareColorizeTensor(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  target = 512,
): { tensor: Float32Array; outW: number; outH: number; offsetX: number; offsetY: number } {
  const scale = Math.min(1, target / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));
  const tensor = new Float32Array(3 * outW * outH);

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const sx = (x / outW) * width;
      const sy = (y / outH) * height;
      const r = sampleBilinear(rgba, width, height, sx, sy, 0);
      const g = sampleBilinear(rgba, width, height, sx, sy, 1);
      const b = sampleBilinear(rgba, width, height, sx, sy, 2);
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      const idx = y * outW + x;
      tensor[idx] = gray / 255;
      tensor[outW * outH + idx] = gray / 255;
      tensor[2 * outW * outH + idx] = gray / 255;
    }
  }

  return { tensor, outW, outH, offsetX: 0, offsetY: 0 };
}

export function resizeRgba(
  src: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = (x / dstW) * srcW;
      const sy = (y / dstH) * srcH;
      const o = (y * dstW + x) * 4;
      out[o] = Math.round(sampleBilinear(src, srcW, srcH, sx, sy, 0));
      out[o + 1] = Math.round(sampleBilinear(src, srcW, srcH, sx, sy, 1));
      out[o + 2] = Math.round(sampleBilinear(src, srcW, srcH, sx, sy, 2));
      out[o + 3] = 255;
    }
  }
  return out;
}

export function estimateUpscaleOutput(
  width: number,
  height: number,
  scale: 2 | 4,
): { outW: number; outH: number; inputW: number; inputH: number; memoryMb: number } {
  const long = Math.max(width, height);
  const fit = long > MAX_UPSCALE_LONG_EDGE ? MAX_UPSCALE_LONG_EDGE / long : 1;
  const inputW = Math.max(1, Math.round(width * fit));
  const inputH = Math.max(1, Math.round(height * fit));

  let processW = inputW;
  let processH = inputH;
  if (scale === 2) {
    processW = Math.max(1, Math.round(inputW / 2));
    processH = Math.max(1, Math.round(inputH / 2));
  }

  const outW = processW * ESRGAN_SCALE;
  const outH = processH * ESRGAN_SCALE;
  const memoryMb = Math.round((outW * outH * 4) / (1024 * 1024));
  return { outW, outH, inputW, inputH, memoryMb };
}

export function readImageDataFromImage(image: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法读取图片像素');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToBlob(data: ImageData, mime: 'image/png' | 'image/jpeg' = 'image/png'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = data.width;
  canvas.height = data.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法导出图片');
  ctx.putImageData(data, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('导出失败'))),
      mime,
      mime === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}

export function imageDataToObjectUrl(data: ImageData, mime: 'image/png' | 'image/jpeg' = 'image/png'): Promise<string> {
  return imageDataToBlob(data, mime).then((blob) => URL.createObjectURL(blob));
}
