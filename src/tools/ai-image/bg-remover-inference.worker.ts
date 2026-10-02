/**
 * MODNet 抠图推理 Worker。
 * 模型权重走 Hugging Face CDN + IndexedDB 缓存（transformers.js env.useBrowserCache）。
 */

import { pipeline, RawImage, type BackgroundRemovalPipeline } from '@huggingface/transformers';

import { configureTransformersEnv } from '@/lib/core/transformers-env';

configureTransformersEnv();

const MODEL_ID = 'Xenova/modnet';

type WorkerRequest =
  | { type: 'init'; device: 'webgpu' | 'wasm' }
  | { type: 'infer'; id: number; bitmap: ImageBitmap };

type WorkerResponse =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; device: string }
  | {
      type: 'result';
      id: number;
      mask: Uint8ClampedArray;
      width: number;
      height: number;
      elapsedMs: number;
    }
  | { type: 'error'; message: string };

let remover: BackgroundRemovalPipeline | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  self.postMessage(msg, transfer ?? []);
}

function reportProgress(loaded: number, total: number, status: string) {
  const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
  post({ type: 'progress', percent, status });
}

async function loadRemover(device: 'webgpu' | 'wasm') {
  return pipeline('background-removal', MODEL_ID, {
    device,
    dtype: device === 'webgpu' ? 'q4' : 'q8',
    progress_callback: (info: { status?: string; loaded?: number; total?: number }) => {
      if (info.status === 'progress' && info.loaded != null && info.total != null) {
        reportProgress(info.loaded, info.total, '下载模型权重…');
      }
    },
  });
}

async function ensureModel(device: 'webgpu' | 'wasm') {
  if (remover && activeDevice === device) return;

  remover = null;
  post({
    type: 'progress',
    percent: 0,
    status: '正在连接 Hugging Face 下载抠图模型（约 25MB，仅首次）…',
  });

  try {
    remover = await loadRemover(device);
    activeDevice = device;
  } catch (err) {
    if (device !== 'webgpu') throw err;
    post({ type: 'progress', percent: 0, status: 'WebGPU 不可用，回退 WASM…' });
    remover = await loadRemover('wasm');
    activeDevice = 'wasm';
  }
}

function extractAlphaMask(output: RawImage): Uint8ClampedArray {
  const { width, height, data, channels } = output;
  const pixels = width * height;
  const mask = new Uint8ClampedArray(pixels);

  if (channels === 4) {
    for (let i = 0; i < pixels; i++) mask[i] = data[i * 4 + 3]!;
  } else if (channels === 1) {
    for (let i = 0; i < pixels; i++) mask[i] = data[i]!;
  } else {
    for (let i = 0; i < pixels; i++) mask[i] = data[i * channels]!;
  }

  return mask;
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'init') {
      await ensureModel(msg.device);
      post({ type: 'ready', device: activeDevice });
      return;
    }

    if (msg.type === 'infer') {
      if (!remover) {
        await ensureModel(activeDevice);
      }

      post({ type: 'progress', percent: 0, status: '正在分割前景…' });
      const started = performance.now();

      const canvas = new OffscreenCanvas(msg.bitmap.width, msg.bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建 OffscreenCanvas');
      ctx.drawImage(msg.bitmap, 0, 0);
      const input = await RawImage.read(canvas);
      const output = await remover!(input);
      const result = Array.isArray(output) ? output[0]! : output;
      const mask = extractAlphaMask(result);
      const elapsedMs = Math.round(performance.now() - started);

      post(
        {
          type: 'result',
          id: msg.id,
          mask,
          width: result.width,
          height: result.height,
          elapsedMs,
        },
        [mask.buffer],
      );
      msg.bitmap.close();
      return;
    }
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : '抠图推理失败',
    });
  }
};
