'use client';

import * as React from 'react';

import type { TranscriptChunk, WhisperModelKey } from '@/lib/core/whisper';

export interface WhisperProgress {
  status: string;
  progress: number;
}

export interface WhisperTranscribeResult {
  text: string;
  chunks: TranscriptChunk[];
  durationSec: number;
}

interface PendingJob<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  onPartial?: (partial: WhisperTranscribeResult) => void;
}

export function useWhisperWorker() {
  const workerRef = React.useRef<Worker | null>(null);
  const jobIdRef = React.useRef(0);
  const pendingRef = React.useRef<Map<number, PendingJob<unknown>>>(new Map());
  const modelRef = React.useRef<WhisperModelKey | null>(null);
  const deviceRef = React.useRef<'webgpu' | 'wasm' | null>(null);

  const [progress, setProgress] = React.useState<WhisperProgress | null>(null);
  const [initializing, setInitializing] = React.useState(false);
  const [partial, setPartial] = React.useState<WhisperTranscribeResult | null>(null);

  React.useEffect(() => {
    const pending = pendingRef.current;
    const worker = new Worker(new URL('./whisper.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as {
        type: string;
        id: number;
        status?: string;
        progress?: number;
        chunks?: TranscriptChunk[];
        text?: string;
        durationSec?: number;
        message?: string;
      };

      if (data.type === 'progress') {
        setProgress({
          status: data.status ?? '',
          progress: data.progress ?? 0,
        });
        return;
      }

      const pending = pendingRef.current.get(data.id);
      if (!pending) return;

      if (data.type === 'ready') {
        setInitializing(false);
        setProgress(null);
        pending.resolve({ text: '', chunks: [], durationSec: 0 });
        pendingRef.current.delete(data.id);
        return;
      }

      if (data.type === 'partial') {
        const partialResult: WhisperTranscribeResult = {
          text: data.text ?? '',
          chunks: data.chunks ?? [],
          durationSec: 0,
        };
        setPartial(partialResult);
        pending.onPartial?.(partialResult);
        return;
      }

      if (data.type === 'result') {
        setProgress(null);
        setPartial(null);
        pending.resolve({
          text: data.text ?? '',
          chunks: data.chunks ?? [],
          durationSec: data.durationSec ?? 0,
        });
        pendingRef.current.delete(data.id);
        return;
      }

      if (data.type === 'error') {
        setProgress(null);
        setPartial(null);
        setInitializing(false);
        pending.reject(new Error(data.message ?? '语音转写失败'));
        pendingRef.current.delete(data.id);
      }
    };

    worker.onerror = () => {
      setProgress(null);
      setPartial(null);
      setInitializing(false);
      for (const [, job] of pendingRef.current) {
        job.reject(new Error('Whisper Worker 异常'));
      }
      pendingRef.current.clear();
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  const runJob = <T,>(
    payload: Record<string, unknown>,
    transfer: Transferable[] = [],
    onPartial?: (partial: WhisperTranscribeResult) => void,
  ): Promise<T> => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('Whisper Worker 未就绪'));

    const id = ++jobIdRef.current;
    return new Promise<T>((resolve, reject) => {
      pendingRef.current.set(id, {
        resolve: resolve as PendingJob<unknown>['resolve'],
        reject,
        onPartial,
      });
      worker.postMessage({ ...payload, id }, transfer);
    });
  };

  const init = React.useCallback(
    async (model: WhisperModelKey, device: 'webgpu' | 'wasm') => {
      if (modelRef.current === model && deviceRef.current === device) return;
      setInitializing(true);
      setProgress({ status: '准备模型…', progress: 0 });
      await runJob({ type: 'init', model, device });
      modelRef.current = model;
      deviceRef.current = device;
    },
    [],
  );

  const transcribe = React.useCallback(
    async (
      audio: Float32Array,
      options: { language?: string | null; onPartial?: (partial: WhisperTranscribeResult) => void } = {},
    ): Promise<WhisperTranscribeResult> => {
      setProgress({ status: '开始转写…', progress: 0 });
      return runJob<WhisperTranscribeResult>(
        {
          type: 'transcribe',
          audio,
          language: options.language ?? null,
        },
        [audio.buffer],
        options.onPartial,
      );
    },
    [],
  );

  const resetModel = React.useCallback(() => {
    modelRef.current = null;
    deviceRef.current = null;
  }, []);

  return {
    init,
    transcribe,
    resetModel,
    progress,
    initializing,
    partial,
  };
}
