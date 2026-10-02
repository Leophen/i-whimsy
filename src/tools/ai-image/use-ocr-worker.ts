'use client';

import * as React from 'react';

import {
  formatOcrStatus,
  type LangPackMode,
  type OcrPsm,
  type OcrWord,
} from '@/lib/core/ocr';
import type { OcrPreprocessConfig } from '@/lib/core/ocr-preprocess';

export interface OcrRecognizeOptions {
  rectangle?: { left: number; top: number; width: number; height: number };
  psm?: OcrPsm;
  preprocess?: OcrPreprocessConfig;
  rotateAuto?: boolean;
}

export interface OcrProgress {
  status: string;
  label: string;
  progress: number;
}

export interface OcrRecognizeResult {
  text: string;
  words: OcrWord[];
  confidence: number;
}

interface PendingJob {
  resolve: (value: OcrRecognizeResult) => void;
  reject: (reason: Error) => void;
}

export function useOcrWorker() {
  const workerRef = React.useRef<Worker | null>(null);
  const jobIdRef = React.useRef(0);
  const pendingRef = React.useRef<Map<number, PendingJob>>(new Map());
  const [progress, setProgress] = React.useState<OcrProgress | null>(null);
  const [initializing, setInitializing] = React.useState(false);

  React.useEffect(() => {
    const pending = pendingRef.current;
    const worker = new Worker(new URL('./ocr.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        id: number;
        status?: string;
        progress?: number;
        text?: string;
        words?: OcrWord[];
        confidence?: number;
        message?: string;
      };

      if (data.type === 'progress') {
        setProgress({
          status: data.status ?? '',
          label: formatOcrStatus(data.status ?? ''),
          progress: data.progress ?? 0,
        });
        return;
      }

      const pending = pendingRef.current.get(data.id);
      if (!pending) return;

      if (data.type === 'ready') {
        setInitializing(false);
        setProgress(null);
        pending.resolve({ text: '', words: [], confidence: 0 });
        pendingRef.current.delete(data.id);
        return;
      }

      if (data.type === 'result') {
        setProgress(null);
        pending.resolve({
          text: data.text ?? '',
          words: data.words ?? [],
          confidence: data.confidence ?? 0,
        });
        pendingRef.current.delete(data.id);
        return;
      }

      if (data.type === 'error') {
        setProgress(null);
        setInitializing(false);
        pending.reject(new Error(data.message ?? 'OCR 失败'));
        pendingRef.current.delete(data.id);
      }
    };

    worker.onerror = () => {
      setProgress(null);
      setInitializing(false);
      for (const [, job] of pendingRef.current) {
        job.reject(new Error('OCR Worker 异常'));
      }
      pendingRef.current.clear();
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  const configRef = React.useRef<{ langMode: LangPackMode; languages: string } | null>(null);

  const runJob = <T,>(payload: Record<string, unknown>): Promise<T> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('OCR Worker 未就绪'));

    const id = ++jobIdRef.current;
    const transfer: Transferable[] = [];
    if (payload.bitmap instanceof ImageBitmap) {
      transfer.push(payload.bitmap);
    }

    return new Promise<T>((resolve, reject) => {
      pendingRef.current.set(id, {
        resolve: resolve as PendingJob['resolve'],
        reject,
      });
      worker.postMessage({ ...payload, id }, transfer);
    });
  };

  const init = React.useCallback(async (langMode: LangPackMode, languages = 'chi_sim+eng') => {
    const cached = configRef.current;
    if (cached?.langMode === langMode && cached.languages === languages) return;
    setInitializing(true);
    setProgress({ status: 'init', label: '准备语言包…', progress: 0 });
    await runJob({ type: 'init', langMode, languages });
    configRef.current = { langMode, languages };
  }, []);

  const recognize = React.useCallback(
    async (bitmap: ImageBitmap, options: OcrRecognizeOptions = {}): Promise<OcrRecognizeResult> => {
      setProgress({ status: 'recognizing', label: '识别文字…', progress: 0 });
      return runJob<OcrRecognizeResult>({
        type: 'recognize',
        bitmap,
        ...options,
      });
    },
    [],
  );

  const terminate = React.useCallback(async () => {
    const worker = workerRef.current;
    if (!worker) return;
    configRef.current = null;
    const id = ++jobIdRef.current;
    worker.postMessage({ type: 'terminate', id });
  }, []);

  return {
    init,
    recognize,
    terminate,
    progress,
    initializing,
  };
}
