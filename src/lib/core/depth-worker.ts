/**
 * 深度估计 Worker 客户端封装。
 */

import type { DepthMap } from './depth';
import { pickInferenceDevice } from './depth';

export interface DepthProgress {
  percent: number;
  status: string;
}

type WorkerOut =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; device: string }
  | { type: 'result'; id: number; depth: Float32Array; width: number; height: number }
  | { type: 'error'; message: string };

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

  initPromise = new Promise((resolve, reject) => {
    const w = getWorker();
    const device = pickInferenceDevice();

    const handler = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, status: msg.status });
      } else if (msg.type === 'ready') {
        w.removeEventListener('message', handler);
        resolve(msg.device);
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handler);
        initPromise = null;
        reject(new Error(msg.message));
      }
    };

    w.addEventListener('message', handler);
    void device.then((d) => w.postMessage({ type: 'init', device: d }));
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
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, w, h);
  const bitmap = await createImageBitmap(canvas);

  const id = ++inferId;
  const depthWorker = getWorker();

  return new Promise((resolve, reject) => {
    const handler = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, status: msg.status });
      } else if (msg.type === 'result' && msg.id === id) {
        depthWorker.removeEventListener('message', handler);
        resolve({
          depth: { data: msg.depth, width: msg.width, height: msg.height },
          device,
        });
      } else if (msg.type === 'error') {
        depthWorker.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    depthWorker.addEventListener('message', handler);
    depthWorker.postMessage({ type: 'infer', id, bitmap }, [bitmap]);
  });
}

export function disposeDepthWorker() {
  worker?.terminate();
  worker = null;
  initPromise = null;
}
