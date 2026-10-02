'use client';

import * as React from 'react';

import type { OutputMime } from '@/lib/core/image';
import { processImagePipeline, type PipelineStep } from '@/lib/core/image-pipeline';

export interface PipelineProcessResult {
  blob: Blob;
  width: number;
  height: number;
  mime: OutputMime;
  size: number;
}

interface PendingJob {
  resolve: (value: PipelineProcessResult) => void;
  reject: (reason: Error) => void;
}

export function useImagePipelineWorker() {
  const workerRef = React.useRef<Worker | null>(null);
  const jobIdRef = React.useRef(0);
  const pendingRef = React.useRef<Map<number, PendingJob>>(new Map());

  React.useEffect(() => {
    const pending = pendingRef.current;
    const worker = new Worker(new URL('./image-pipeline.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        id: number;
        buffer?: ArrayBuffer;
        mime?: OutputMime;
        width?: number;
        height?: number;
        size?: number;
        message?: string;
      };

      const pending = pendingRef.current.get(data.id);
      if (!pending) return;

      if (data.type === 'result' && data.buffer) {
        pending.resolve({
          blob: new Blob([data.buffer], { type: data.mime }),
          width: data.width ?? 0,
          height: data.height ?? 0,
          mime: data.mime ?? 'image/jpeg',
          size: data.size ?? data.buffer.byteLength,
        });
        pendingRef.current.delete(data.id);
        return;
      }

      if (data.type === 'error') {
        pending.reject(new Error(data.message ?? '处理失败'));
        pendingRef.current.delete(data.id);
        return;
      }

      if (data.type === 'cancelled') {
        pending.reject(new Error('已取消'));
        pendingRef.current.delete(data.id);
      }
    };

    worker.onerror = () => {
      for (const [, job] of pendingRef.current) {
        job.reject(new Error('Worker 异常'));
      }
      pendingRef.current.clear();
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  const processImage = React.useCallback(
    async (file: File, steps: PipelineStep[]): Promise<PipelineProcessResult> => {
      // Safari 等环境 Worker 内 OffscreenCanvas 不可用，回退主线程处理。
      if (typeof OffscreenCanvas === 'undefined') {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        try {
          const result = await processImagePipeline(bitmap, steps);
          return {
            blob: result.blob,
            width: result.width,
            height: result.height,
            mime: result.mime,
            size: result.blob.size,
          };
        } finally {
          bitmap.close();
        }
      }

      const worker = workerRef.current;
      if (!worker) throw new Error('Worker 未就绪');

      const id = ++jobIdRef.current;
      const buffer = await file.arrayBuffer();

      return new Promise<PipelineProcessResult>((resolve, reject) => {
        pendingRef.current.set(id, { resolve, reject });
        worker.postMessage(
          {
            type: 'process',
            id,
            buffer,
            mimeType: file.type || 'image/png',
            steps,
          },
          [buffer],
        );
      });
    },
    [],
  );

  const cancel = React.useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const id = jobIdRef.current;
    worker.postMessage({ type: 'cancel', id });
    for (const [jobId, job] of pendingRef.current) {
      if (jobId === id) {
        job.reject(new Error('已取消'));
        pendingRef.current.delete(jobId);
      }
    }
  }, []);

  return { processImage, cancel };
}
