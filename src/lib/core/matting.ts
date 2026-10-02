/**
 * 抠图后处理 —— mask 羽化/收缩、前景合成、背景替换。纯函数，无 React。
 */

export interface SourcePixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type BackgroundMode = 'transparent' | 'solid' | 'gradient' | 'image';

export interface GradientBackground {
  from: string;
  to: string;
  angle: number;
}

export interface MattingRenderOptions {
  feather: number;
  shrink: number;
  backgroundMode: BackgroundMode;
  solidColor: string;
  gradient: GradientBackground;
  /** transparent 模式下是否在画布上绘制背景（导出 PNG 透明底时为 false） */
  paintBackground: boolean;
}

/** 将图片缩放到指定尺寸并读取 RGBA 像素。 */
export function extractScaledPixels(
  img: HTMLImageElement,
  width: number,
  height: number,
): SourcePixels {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return { data: imageData.data, width, height };
}

export const DEFAULT_MATTING_OPTIONS: MattingRenderOptions = {
  feather: 0,
  shrink: 0,
  backgroundMode: 'transparent',
  solidColor: '#ffffff',
  gradient: { from: '#667eea', to: '#764ba2', angle: 135 },
  paintBackground: true,
};

export const GRADIENT_PRESETS: { name: string; gradient: GradientBackground }[] = [
  { name: '天空', gradient: { from: '#89f7fe', to: '#66a6ff', angle: 160 } },
  { name: '日落', gradient: { from: '#fa709a', to: '#fee140', angle: 120 } },
  { name: '森林', gradient: { from: '#11998e', to: '#38ef7d', angle: 135 } },
  { name: '紫雾', gradient: { from: '#667eea', to: '#764ba2', angle: 135 } },
  { name: '暖灰', gradient: { from: '#fdfbfb', to: '#ebedee', angle: 180 } },
  { name: '深夜', gradient: { from: '#0f2027', to: '#203a43', angle: 160 } },
];

function buildGaussianKernel(radius: number): Float32Array {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const sigma = Math.max(0.5, radius / 2);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const v = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel[i] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}

function gaussianBlurAlpha(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  if (radius <= 0) return src;
  const kernel = buildGaussianKernel(radius);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(width - 1, Math.max(0, x + k));
        const w = kernel[k + radius]!;
        sum += src[y * width + sx]! * w;
        wsum += w;
      }
      tmp[y * width + x] = sum / wsum;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        const w = kernel[k + radius]!;
        sum += tmp[sy * width + x]! * w;
        wsum += w;
      }
      out[y * width + x] = sum / wsum;
    }
  }

  const result = new Uint8ClampedArray(src.length);
  for (let i = 0; i < out.length; i++) result[i] = Math.round(out[i]!);
  return result;
}

function erodeAlpha(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  passes: number,
): Uint8ClampedArray {
  let current = src;
  for (let p = 0; p < passes; p++) {
    const out = new Uint8ClampedArray(current.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        let min = current[i]!;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sx = Math.min(width - 1, Math.max(0, x + dx));
            const sy = Math.min(height - 1, Math.max(0, y + dy));
            min = Math.min(min, current[sy * width + sx]!);
          }
        }
        out[i] = min;
      }
    }
    current = out;
  }
  return current;
}

/** 对 alpha mask 做羽化与边缘收缩。 */
export function refineMask(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  feather: number,
  shrink: number,
): Uint8ClampedArray {
  let current = new Uint8ClampedArray(mask);

  if (shrink > 0) {
    const threshold = Math.round((shrink / 100) * 96);
    for (let i = 0; i < current.length; i++) {
      const v = current[i]!;
      current[i] = v > threshold ? v : 0;
    }
    const passes = Math.max(1, Math.round(shrink / 20));
    current = new Uint8ClampedArray(erodeAlpha(current, width, height, passes));
  }

  if (feather > 0) {
    const radius = Math.max(1, Math.round((feather / 100) * 10));
    current = new Uint8ClampedArray(gaussianBlurAlpha(current, width, height, radius));
  }

  return current;
}

/** 将 refined mask 与原图 RGB 合成 RGBA ImageData。 */
export function compositeForeground(
  source: SourcePixels,
  mask: Uint8ClampedArray,
  feather: number,
  shrink: number,
): ImageData {
  const refined = refineMask(mask, source.width, source.height, feather, shrink);
  const rgba = new Uint8ClampedArray(source.width * source.height * 4);
  const { data, width, height } = source;

  for (let i = 0; i < width * height; i++) {
    const si = i * 4;
    rgba[si] = data[si]!;
    rgba[si + 1] = data[si + 1]!;
    rgba[si + 2] = data[si + 2]!;
    rgba[si + 3] = refined[i]!;
  }

  return new ImageData(rgba, width, height);
}

export function paintBackgroundLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: BackgroundMode,
  solidColor: string,
  gradient: GradientBackground,
  bgImage: CanvasImageSource | null,
): void {
  if (mode === 'transparent') return;

  if (mode === 'solid') {
    ctx.fillStyle = solidColor;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === 'gradient') {
    const rad = (gradient.angle * Math.PI) / 180;
    const x = Math.cos(rad) * width;
    const y = Math.sin(rad) * height;
    const g = ctx.createLinearGradient(
      width / 2 - x / 2,
      height / 2 - y / 2,
      width / 2 + x / 2,
      height / 2 + y / 2,
    );
    g.addColorStop(0, gradient.from);
    g.addColorStop(1, gradient.to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (mode === 'image' && bgImage) {
    ctx.drawImage(bgImage, 0, 0, width, height);
  }
}

/** 渲染完整结果到 canvas（背景 + 前景）。 */
export function renderMattingCanvas(
  source: SourcePixels,
  mask: Uint8ClampedArray,
  options: MattingRenderOptions,
  bgImage: CanvasImageSource | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');

  if (options.paintBackground && options.backgroundMode !== 'transparent') {
    paintBackgroundLayer(
      ctx,
      source.width,
      source.height,
      options.backgroundMode,
      options.solidColor,
      options.gradient,
      bgImage,
    );
  }

  const fg = compositeForeground(source, mask, options.feather, options.shrink);
  ctx.putImageData(fg, 0, 0);
  return canvas;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement, mime: 'image/png' | 'image/jpeg'): string {
  return canvas.toDataURL(mime, mime === 'image/jpeg' ? 0.92 : undefined);
}
