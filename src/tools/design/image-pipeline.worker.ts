/**
 * 批量图像流水线 Worker —— 串行处理单张图片，避免 OOM。
 */

import { processImagePipeline, type PipelineStep } from '@/lib/core/image-pipeline';

export interface WorkerProcessRequest {
  type: 'process';
  id: number;
  buffer: ArrayBuffer;
  mimeType: string;
  steps: PipelineStep[];
}

export interface WorkerCancelRequest {
  type: 'cancel';
  id: number;
}

type WorkerRequest = WorkerProcessRequest | WorkerCancelRequest;

let cancelledId: number | null = null;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;

  if (data.type === 'cancel') {
    cancelledId = data.id;
    return;
  }

  if (data.type !== 'process') return;

  const { id, buffer, mimeType, steps } = data;

  try {
    if (cancelledId === id) {
      self.postMessage({ type: 'cancelled', id });
      cancelledId = null;
      return;
    }

    const blob = new Blob([buffer], { type: mimeType });
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });

    if (cancelledId === id) {
      bitmap.close();
      self.postMessage({ type: 'cancelled', id });
      cancelledId = null;
      return;
    }

    const result = await processImagePipeline(bitmap, steps, {
      shouldCancel: () => cancelledId === id,
    });
    const arrayBuffer = await result.blob.arrayBuffer();

    self.postMessage(
      {
        type: 'result',
        id,
        buffer: arrayBuffer,
        mime: result.mime,
        width: result.width,
        height: result.height,
        size: result.blob.size,
      },
      [arrayBuffer],
    );
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : '处理失败',
    });
  }
};
