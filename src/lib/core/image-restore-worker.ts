/**
 * 图像修复 Worker 客户端封装。
 */

import {
  RESTORE_MODELS,
  blendUpscaleTile,
  buildUpscaleTiles,
  estimateUpscaleOutput,
  extractTileTensor,
  findMaskBounds,
  floatRgbToRgba,
  mergeLabColorization,
  pasteLamaResult,
  prepareColorizeTensor,
  prepareLamaPatch,
  readImageDataFromImage,
  resizeRgba,
  rgbaToGrayscale,
  type LamaPatch,
  type RestoreMode,
} from '@/lib/core/image-restore';
import { pickInferenceDevice } from '@/lib/core/depth';

export interface RestoreProgress {
  percent: number;
  status: string;
}

type WorkerOut =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; mode: RestoreMode; device: string }
  | { type: 'result-lama'; id: number; rgb: Float32Array; elapsedMs: number }
  | {
      type: 'result-esrgan';
      id: number;
      rgb: Float32Array;
      width: number;
      height: number;
      elapsedMs: number;
    }
  | {
      type: 'result-ddcolor';
      id: number;
      rgb: Float32Array;
      width: number;
      height: number;
      elapsedMs: number;
    }
  | { type: 'error'; message: string };

let worker: Worker | null = null;
let inferId = 0;
const initPromises = new Map<RestoreMode, Promise<string>>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('../../tools/ai-image/image-restore-inference.worker.ts', import.meta.url),
      { type: 'module' },
    );
  }
  return worker;
}

function waitFor<T>(
  w: Worker,
  predicate: (msg: WorkerOut) => T | null,
  onProgress?: (p: RestoreProgress) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, status: msg.status });
        return;
      }
      if (msg.type === 'error') {
        w.removeEventListener('message', handler);
        reject(new Error(msg.message));
        return;
      }
      const hit = predicate(msg);
      if (hit != null) {
        w.removeEventListener('message', handler);
        resolve(hit);
      }
    };
    w.addEventListener('message', handler);
  });
}

export async function initRestoreModel(
  mode: RestoreMode,
  onProgress?: (p: RestoreProgress) => void,
): Promise<string> {
  const existing = initPromises.get(mode);
  if (existing) return existing;

  const promise = (async () => {
    const w = getWorker();
    const device = await pickInferenceDevice();
    const ready = waitFor(
      w,
      (msg) => (msg.type === 'ready' && msg.mode === mode ? msg.device : null),
      onProgress,
    );
    w.postMessage({ type: 'init', mode, device });
    return ready;
  })();

  const tracked = promise.catch((err) => {
    initPromises.delete(mode);
    throw err;
  });
  initPromises.set(mode, tracked);
  return tracked;
}

async function inferLamaPatch(
  patch: LamaPatch,
  onProgress?: (p: RestoreProgress) => void,
): Promise<Float32Array> {
  await initRestoreModel('inpaint', onProgress);
  const w = getWorker();
  const id = ++inferId;
  const result = waitFor(
    w,
    (msg) => (msg.type === 'result-lama' && msg.id === id ? msg.rgb : null),
    onProgress,
  );
  w.postMessage(
    {
      type: 'infer-lama',
      id,
      image: patch.image,
      mask: patch.mask,
    },
    [patch.image.buffer, patch.mask.buffer],
  );
  return result;
}

async function inferEsrganTile(
  tensor: Float32Array,
  width: number,
  height: number,
  onProgress?: (p: RestoreProgress) => void,
): Promise<{ rgb: Float32Array; width: number; height: number }> {
  await initRestoreModel('upscale', onProgress);
  const w = getWorker();
  const id = ++inferId;
  const result = waitFor(
    w,
    (msg) =>
      msg.type === 'result-esrgan' && msg.id === id
        ? { rgb: msg.rgb, width: msg.width, height: msg.height }
        : null,
    onProgress,
  );
  w.postMessage(
    { type: 'infer-esrgan', id, image: tensor, width, height },
    [tensor.buffer],
  );
  return result;
}

async function inferDdcolor(
  tensor: Float32Array,
  width: number,
  height: number,
  onProgress?: (p: RestoreProgress) => void,
): Promise<{ rgb: Float32Array; width: number; height: number }> {
  await initRestoreModel('colorize', onProgress);
  const w = getWorker();
  const id = ++inferId;
  const result = waitFor(
    w,
    (msg) =>
      msg.type === 'result-ddcolor' && msg.id === id
        ? { rgb: msg.rgb, width: msg.width, height: msg.height }
        : null,
    onProgress,
  );
  w.postMessage(
    { type: 'infer-ddcolor', id, image: tensor, width, height },
    [tensor.buffer],
  );
  return result;
}

export async function runInpaint(
  image: HTMLImageElement,
  mask: Uint8ClampedArray,
  onProgress?: (p: RestoreProgress) => void,
): Promise<{ data: ImageData; elapsedMs: number; device: string }> {
  const source = readImageDataFromImage(image);
  const bounds = findMaskBounds(mask, source.width, source.height);
  if (!bounds) throw new Error('请先用笔刷涂抹要去除的区域');

  const patch = prepareLamaPatch(source.data, mask, source.width, source.height, bounds);
  onProgress?.({ percent: 5, status: '准备 LaMa 输入…' });
  const started = performance.now();
  const device = await initRestoreModel('inpaint', onProgress);
  const rgb = await inferLamaPatch(patch, onProgress);
  const merged = pasteLamaResult(
    source.data,
    source.width,
    source.height,
    rgb,
    bounds,
    mask,
  );

  return {
    data: new ImageData(new Uint8ClampedArray(merged), source.width, source.height),
    elapsedMs: Math.round(performance.now() - started),
    device,
  };
}

export async function runUpscale(
  image: HTMLImageElement,
  scale: 2 | 4,
  onProgress?: (p: RestoreProgress) => void,
): Promise<{ data: ImageData; elapsedMs: number; device: string }> {
  const source = readImageDataFromImage(image);
  const { outW, outH, inputW, inputH, memoryMb } = estimateUpscaleOutput(
    source.width,
    source.height,
    scale,
  );

  if (scale === 4 && source.width * source.height > 4_000_000) {
    throw new Error('4× 放大时输入分辨率过高，请先缩小图片或使用 2×');
  }

  onProgress?.({
    percent: 2,
    status: `预计输出 ${outW}×${outH}（约 ${memoryMb}MB 内存）`,
  });

  let rgba = source.data;
  let rw = source.width;
  let rh = source.height;

  if (inputW !== source.width || inputH !== source.height) {
    rgba = new Uint8ClampedArray(resizeRgba(source.data, source.width, source.height, inputW, inputH));
    rw = inputW;
    rh = inputH;
  }

  let processRgba = rgba;
  let processW = rw;
  let processH = rh;
  if (scale === 2) {
    processW = Math.max(1, Math.round(rw / 2));
    processH = Math.max(1, Math.round(rh / 2));
    processRgba = new Uint8ClampedArray(resizeRgba(rgba, rw, rh, processW, processH));
  }

  const started = performance.now();
  const device = await initRestoreModel('upscale', onProgress);
  const tiles = buildUpscaleTiles(processW, processH);
  const output = new Float32Array(outW * outH * 4);
  for (let i = 0; i < output.length; i += 4) output[i + 3] = 255;

  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i]!;
    onProgress?.({
      percent: Math.round(10 + (i / tiles.length) * 85),
      status: `分块放大 ${i + 1}/${tiles.length}`,
    });
    const { tensor } = extractTileTensor(processRgba, processW, processH, tile);
    const { rgb, width: tw, height: th } = await inferEsrganTile(
      tensor,
      128,
      128,
      onProgress,
    );
    blendUpscaleTile(output, outW, outH, tile, rgb, tw, th);
  }

  const clamped = new Uint8ClampedArray(outW * outH * 4);
  for (let i = 0; i < outW * outH; i++) {
    const o = i * 4;
    clamped[o] = Math.round(Math.min(255, Math.max(0, output[o]!)));
    clamped[o + 1] = Math.round(Math.min(255, Math.max(0, output[o + 1]!)));
    clamped[o + 2] = Math.round(Math.min(255, Math.max(0, output[o + 2]!)));
    clamped[o + 3] = 255;
  }

  return {
    data: new ImageData(clamped, outW, outH),
    elapsedMs: Math.round(performance.now() - started),
    device,
  };
}

export async function runColorize(
  image: HTMLImageElement,
  onProgress?: (p: RestoreProgress) => void,
): Promise<{ data: ImageData; elapsedMs: number; device: string }> {
  const source = readImageDataFromImage(image);
  const gray = rgbaToGrayscale(source.data);
  const { tensor, outW, outH } = prepareColorizeTensor(gray, source.width, source.height);
  const started = performance.now();
  const device = await initRestoreModel('colorize', onProgress);
  const { rgb, width, height } = await inferDdcolor(tensor, outW, outH, onProgress);
  const colorized = floatRgbToRgba(rgb, width, height);
  const resized =
    width === source.width && height === source.height
      ? colorized
      : resizeRgba(colorized, width, height, source.width, source.height);
  const merged = mergeLabColorization(gray, resized);

  return {
    data: new ImageData(new Uint8ClampedArray(merged), source.width, source.height),
    elapsedMs: Math.round(performance.now() - started),
    device,
  };
}

export function getRestoreModelLabel(mode: RestoreMode): string {
  const m = RESTORE_MODELS[mode];
  return `${m.label} · ${m.sizeLabel}`;
}

export function disposeRestoreWorker() {
  worker?.terminate();
  worker = null;
  initPromises.clear();
}
