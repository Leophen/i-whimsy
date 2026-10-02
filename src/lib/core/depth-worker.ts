/**
 * 深度估计 Worker 客户端封装。
 */

import type { DepthMap } from './depth';
import { pickInferenceDevice } from './depth';
import { formatModelLoadError } from './promise-utils';
import { waitForWorker } from './worker-rpc';

export interface DepthProgress {
  percent: number;
  status: string;
}

type WorkerOut =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; device: string }
  | { type: 'result'; id: number; depth: Float32Array; width: number; height: number }
  | { type: 'error'; message: string };

/** 首次下载 Depth Anything Small（约 26MB）+ Worker 冷启动。 */
const INIT_TIMEOUT_MS = 180_000;
const INFER_TIMEOUT_MS = 120_000;
const MODEL_HINT = 'Depth Anything V2 Small（约 26MB）';

let worker: Worker | null = null;
let initPromise: Promise<string> | null = null;
let inferId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../tools/ai-image/depth-inference.worker.ts', import.meta.url));
  }
  return worker;
}

export async function initDepthModel(
  onProgress?: (p: DepthProgress) => void,
): Promise<string> {
  if (initPromise) return initPromise;

  onProgress?.({ percent: 0, status: '正在启动深度推理 Worker…' });

  initPromise = (async () => {
    const w = getWorker();
    const device = await pickInferenceDevice();

    const ready = waitForWorker(
      w,
      (msg) => {
        const m = msg as WorkerOut;
        return m.type === 'ready' ? m.device : null;
      },
      {
        timeoutMs: INIT_TIMEOUT_MS,
        timeoutMessage: `深度模型加载超时：${MODEL_HINT} 在 ${INIT_TIMEOUT_MS / 1000}s 内未完成。请检查网络是否能访问 Hugging Face，或配置 NEXT_PUBLIC_HF_ENDPOINT 镜像后刷新重试。`,
        modelHint: MODEL_HINT,
        onProgress,
      },
    );

    w.postMessage({ type: 'init', device });
    return ready;
  })().catch((err) => {
    initPromise = null;
    throw new Error(formatModelLoadError(err, MODEL_HINT));
  });

  return initPromise;
}

export async function estimateDepthFromImage(
  image: HTMLImageElement,
  onProgress?: (p: DepthProgress) => void,
): Promise<{ depth: DepthMap; device: string }> {
  const device = await initDepthModel(onProgress);

  const maxSide = 768;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * ratio));
  const h = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');
  ctx.drawImage(image, 0, 0, w, h);
  const bitmap = await createImageBitmap(canvas);

  const id = ++inferId;
  const depthWorker = getWorker();

  const inferPromise = waitForWorker(
    depthWorker,
    (msg) => {
      const m = msg as WorkerOut;
      return m.type === 'result' && m.id === id
        ? { depth: { data: m.depth, width: m.width, height: m.height }, device }
        : null;
    },
    {
      timeoutMs: INFER_TIMEOUT_MS,
      timeoutMessage: `深度估计超时（${INFER_TIMEOUT_MS / 1000}s）。请换一张较小的图片或稍后重试。`,
      modelHint: MODEL_HINT,
      onProgress,
    },
  );

  depthWorker.postMessage({ type: 'infer', id, bitmap }, [bitmap]);
  return inferPromise;
}

export function disposeDepthWorker() {
  worker?.terminate();
  worker = null;
  initPromise = null;
}
