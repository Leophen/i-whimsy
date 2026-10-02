/**
 * 抠图 Worker 客户端封装。
 */

import { pickInferenceDevice } from './depth';

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
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, w, h);
  const bitmap = await createImageBitmap(canvas);

  const id = ++inferId;
  const mattingWorker = getWorker();

  return new Promise((resolve, reject) => {
    const handler = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, status: msg.status });
      } else if (msg.type === 'result' && msg.id === id) {
        mattingWorker.removeEventListener('message', handler);
        resolve({
          mask: msg.mask,
          width: msg.width,
          height: msg.height,
          elapsedMs: msg.elapsedMs,
          device,
        });
      } else if (msg.type === 'error') {
        mattingWorker.removeEventListener('message', handler);
        reject(new Error(msg.message));
      }
    };
    mattingWorker.addEventListener('message', handler);
    mattingWorker.postMessage({ type: 'infer', id, bitmap }, [bitmap]);
  });
}

export function disposeMattingWorker() {
  worker?.terminate();
  worker = null;
  initPromise = null;
}
