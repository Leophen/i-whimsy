/**
 * 深度图处理 —— 归一化、平滑、边缘收缩，纯函数无 React 依赖。
 */

export interface DepthMap {
  data: Float32Array;
  width: number;
  height: number;
}

/** 将原始深度张量归一化到 0–1（近=1，远=0）。 */
export function normalizeDepth(raw: Float32Array): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    // Depth Anything：值越小越近，翻转使近处=1
    out[i] = 1 - (raw[i] - min) / span;
  }
  return out;
}

/** 可分离高斯模糊，sigma 由 radius 近似。 */
export function gaussianBlurDepth(
  src: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  if (radius <= 0) return src;
  const kernel = buildGaussianKernel(radius);
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);

  // 水平
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sx = Math.min(width - 1, Math.max(0, x + k));
        const w = kernel[k + radius];
        sum += src[y * width + sx] * w;
        wsum += w;
      }
      tmp[y * width + x] = sum / wsum;
    }
  }

  // 垂直
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let wsum = 0;
      for (let k = -radius; k <= radius; k++) {
        const sy = Math.min(height - 1, Math.max(0, y + k));
        const w = kernel[k + radius];
        sum += tmp[sy * width + x] * w;
        wsum += w;
      }
      out[y * width + x] = sum / wsum;
    }
  }
  return out;
}

function buildGaussianKernel(radius: number): Float32Array {
  const size = radius * 2 + 1;
  const kernel = new Float32Array(size);
  const sigma = radius / 2;
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

/** 边缘收缩：对深度梯度大的区域向内收一点，减轻视差漏光。 */
export function erodeDepthEdges(
  src: Float32Array,
  width: number,
  height: number,
  passes = 1,
): Float32Array {
  let current = src;
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(current.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const d = current[i];
        const left = x > 0 ? current[i - 1] : d;
        const right = x < width - 1 ? current[i + 1] : d;
        const up = y > 0 ? current[i - width] : d;
        const down = y < height - 1 ? current[i + width] : d;
        const grad = Math.abs(right - d) + Math.abs(left - d) + Math.abs(down - d) + Math.abs(up - d);
        const shrink = grad > 0.15 ? 0.92 : 1;
        out[i] = d * shrink;
      }
    }
    current = out;
  }
  return current;
}

/** 完整后处理管线。 */
export function processDepthMap(raw: Float32Array, width: number, height: number): DepthMap {
  let data = normalizeDepth(raw);
  data = gaussianBlurDepth(data, width, height, 2);
  data = erodeDepthEdges(data, width, height, 1);
  return { data, width, height };
}

/** 深度图转灰度 ImageData（预览用）。 */
export function depthToImageData(depth: DepthMap): ImageData {
  const { data, width, height } = depth;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i++) {
    const v = Math.round(data[i] * 255);
    const o = i * 4;
    rgba[o] = v;
    rgba[o + 1] = v;
    rgba[o + 2] = v;
    rgba[o + 3] = 255;
  }
  return new ImageData(rgba, width, height);
}

/** 双线性采样深度（UV 0–1）。 */
export function sampleDepth(depth: DepthMap, u: number, v: number): number {
  const x = Math.min(depth.width - 1, Math.max(0, u * (depth.width - 1)));
  const y = Math.min(depth.height - 1, Math.max(0, v * (depth.height - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(depth.width - 1, x0 + 1);
  const y1 = Math.min(depth.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const d00 = depth.data[y0 * depth.width + x0];
  const d10 = depth.data[y0 * depth.width + x1];
  const d01 = depth.data[y1 * depth.width + x0];
  const d11 = depth.data[y1 * depth.width + x1];
  return (
    d00 * (1 - fx) * (1 - fy) +
    d10 * fx * (1 - fy) +
    d01 * (1 - fx) * fy +
    d11 * fx * fy
  );
}

/**
 * 选择推理设备：iOS 与无 COOP/COEP 环境强制 WASM；
 * WebGPU 仅作加速项。
 */
export async function pickInferenceDevice(): Promise<'webgpu' | 'wasm'> {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'wasm';
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) return 'wasm';

  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) return 'wasm';
    const adapter = await gpu.requestAdapter();
    return adapter ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}
