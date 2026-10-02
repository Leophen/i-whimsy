/**
 * Worker 消息等待 + 超时，避免 init/infer 永久挂起。
 */

import { formatModelLoadError, TimeoutError, withTimeout } from './promise-utils';

export interface WorkerProgress {
  percent: number;
  status: string;
}

type ProgressMessage = { type: 'progress'; percent: number; status: string };
type ErrorMessage = { type: 'error'; message: string };

export function waitForWorker<T>(
  worker: Worker,
  match: (msg: unknown) => T | null,
  options: {
    timeoutMs: number;
    timeoutMessage: string;
    modelHint?: string;
    onProgress?: (p: WorkerProgress) => void;
  },
): Promise<T> {
  const { timeoutMs, timeoutMessage, modelHint = '模型', onProgress } = options;

  const listen = new Promise<T>((resolve, reject) => {
    const handler = (ev: MessageEvent) => {
      const msg = ev.data as ProgressMessage | ErrorMessage | Record<string, unknown>;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'progress' && typeof msg.percent === 'number') {
        onProgress?.({
          percent: msg.percent,
          status: typeof msg.status === 'string' ? msg.status : '处理中…',
        });
        return;
      }

      if (msg.type === 'error') {
        worker.removeEventListener('message', handler);
        worker.removeEventListener('error', onWorkerError);
        reject(new Error(formatModelLoadError(msg.message, modelHint)));
        return;
      }

      const hit = match(msg);
      if (hit != null) {
        worker.removeEventListener('message', handler);
        worker.removeEventListener('error', onWorkerError);
        resolve(hit);
      }
    };

    const onWorkerError = () => {
      worker.removeEventListener('message', handler);
      worker.removeEventListener('error', onWorkerError);
      reject(new Error('推理 Worker 运行失败，请刷新页面后重试'));
    };

    worker.addEventListener('message', handler);
    worker.addEventListener('error', onWorkerError);
  });

  return withTimeout(listen, timeoutMs, timeoutMessage).catch((err) => {
    if (err instanceof TimeoutError) {
      throw new Error(formatModelLoadError(err, modelHint));
    }
    throw err;
  });
}
