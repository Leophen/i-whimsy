/**
 * 抠图 Worker 客户端封装。
 */

import { pickInferenceDevice } from './depth';
import { formatModelLoadError } from './promise-utils';
import { waitForWorker } from './worker-rpc';

export interface MattingProgress {
  percent: number;
  status: string;
}

export interface MattingMaskResult {
  mask: Uint8ClampedArray;
  width: number;
  height: number;
  elapsedMs: number;
  device: string;
}

type WorkerOut =
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

/** 首次下载 MODNet（约 25MB）+ Worker 冷启动。 */
const INIT_TIMEOUT_MS = 180_000;
const INFER_TIMEOUT_MS = 120_000;
const MODEL_HINT = 'MODNet 抠图模型（约 25MB）';

let worker: Worker | null = null;
let initPromise: Promise<string> | null = null;
let inferId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('../../tools/ai-image/bg-remover-inference.worker.ts', import.meta.url),
    );
  }
  return worker;
}

export async function initMattingModel(
  onProgress?: (p: MattingProgress) => void,
): Promise<string> {
  if (initPromise) return initPromise;

  onProgress?.({ percent: 0, status: '正在启动抠图 Worker…' });

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
        timeoutMessage: `抠图模型加载超时：${MODEL_HINT} 在 ${INIT_TIMEOUT_MS / 1000}s 内未完成。请检查网络是否能访问 Hugging Face，或配置 NEXT_PUBLIC_HF_ENDPOINT 镜像后刷新重试。`,
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

export async function removeBackgroundFromImage(
  image: HTMLImageElement,
  onProgress?: (p: MattingProgress) => void,
): Promise<MattingMaskResult> {
  const device = await initMattingModel(onProgress);

  const maxSide = 1024;
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
  const mattingWorker = getWorker();

  const inferPromise = waitForWorker(
    mattingWorker,
    (msg) => {
      const m = msg as WorkerOut;
      return m.type === 'result' && m.id === id
        ? {
            mask: m.mask,
            width: m.width,
            height: m.height,
            elapsedMs: m.elapsedMs,
            device,
          }
        : null;
    },
    {
      timeoutMs: INFER_TIMEOUT_MS,
      timeoutMessage: `抠图推理超时（${INFER_TIMEOUT_MS / 1000}s）。请换一张较小的图片或稍后重试。`,
      modelHint: MODEL_HINT,
      onProgress,
    },
  );

  mattingWorker.postMessage({ type: 'infer', id, bitmap }, [bitmap]);
  return inferPromise;
}

export function disposeMattingWorker() {
  worker?.terminate();
  worker = null;
  initPromise = null;
}
