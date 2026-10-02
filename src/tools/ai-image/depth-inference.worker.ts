/**
 * Depth Anything V2 Small 推理 Worker。
 * 模型权重走 Hugging Face CDN + IndexedDB 缓存（transformers.js env.useBrowserCache）。
 */

import { env, pipeline, RawImage, type DepthEstimationPipeline } from '@huggingface/transformers';

import { processDepthMap } from '@/lib/core/depth';

const MODEL_ID = 'onnx-community/depth-anything-v2-small';

type WorkerRequest =
  | { type: 'init'; device: 'webgpu' | 'wasm' }
  | { type: 'infer'; id: number; bitmap: ImageBitmap };

type WorkerResponse =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; device: string }
  | { type: 'result'; id: number; depth: Float32Array; width: number; height: number }
  | { type: 'error'; message: string };

let estimator: DepthEstimationPipeline | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  self.postMessage(msg, transfer ?? []);
}

function reportProgress(loaded: number, total: number, status: string) {
  const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
  post({ type: 'progress', percent, status });
}

async function loadEstimator(device: 'webgpu' | 'wasm') {
  return pipeline('depth-estimation', MODEL_ID, {
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
  if (estimator && activeDevice === device) return;

  env.allowLocalModels = false;
  env.useBrowserCache = true;
  env.allowRemoteModels = true;

  estimator = null;
  post({ type: 'progress', percent: 0, status: '正在加载深度模型…' });

  try {
    estimator = await loadEstimator(device);
    activeDevice = device;
  } catch (err) {
    if (device !== 'webgpu') throw err;
    post({ type: 'progress', percent: 0, status: 'WebGPU 不可用，回退 WASM…' });
    estimator = await loadEstimator('wasm');
    activeDevice = 'wasm';
  }

  post({ type: 'ready', device: activeDevice });
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'init') {
      await ensureModel(msg.device);
      return;
    }

    if (msg.type === 'infer') {
      if (!estimator) {
        await ensureModel(activeDevice);
      }
      post({ type: 'progress', percent: 0, status: '正在估计深度…' });

      const canvas = new OffscreenCanvas(msg.bitmap.width, msg.bitmap.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('无法创建 OffscreenCanvas');
      ctx.drawImage(msg.bitmap, 0, 0);
      const input = await RawImage.read(canvas);
      const output = await estimator!(input);
      const result = Array.isArray(output) ? output[0] : output;
      const tensor = result.predicted_depth;
      const [height, width] = tensor.dims as [number, number];
      const raw = new Float32Array(tensor.data as Float32Array);
      const processed = processDepthMap(raw, width, height);

      post(
        {
          type: 'result',
          id: msg.id,
          depth: processed.data,
          width: processed.width,
          height: processed.height,
        },
        [processed.data.buffer],
      );
      msg.bitmap.close();
      return;
    }
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : '深度估计失败',
    });
  }
};
