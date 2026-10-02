'use client';

import * as React from 'react';

import { pickInferenceDevice } from '@/lib/core/depth';
import type { TtsSentenceChunk } from '@/lib/core/tts';

export interface TtsProgress {
  percent: number;
  status: string;
}

type WorkerOut =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; device: string; dtype: string }
  | {
      type: 'chunk';
      id: number;
      index: number;
      total: number;
      text: string;
      audio: Float32Array;
      sampleRate: number;
    }
  | { type: 'preview-done'; id: number; audio: Float32Array; sampleRate: number }
  | { type: 'complete'; id: number; total: number }
  | { type: 'error'; id?: number; message: string };

export function useTtsWorker() {
  const workerRef = React.useRef<Worker | null>(null);
  const jobIdRef = React.useRef(0);
  const initPromiseRef = React.useRef<Promise<{ device: string; dtype: string }> | null>(null);

  const [progress, setProgress] = React.useState<TtsProgress | null>(null);
  const [initializing, setInitializing] = React.useState(false);
  const [deviceInfo, setDeviceInfo] = React.useState<{ device: string; dtype: string } | null>(
    null,
  );
  const [synthesizing, setSynthesizing] = React.useState(false);

  React.useEffect(() => {
    const worker = new Worker(new URL('./tts.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onerror = () => {
      setProgress(null);
      setInitializing(false);
      setSynthesizing(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      initPromiseRef.current = null;
    };
  }, []);

  const init = React.useCallback(async (): Promise<{ device: string; dtype: string }> => {
    if (deviceInfo) return deviceInfo;
    if (initPromiseRef.current) return initPromiseRef.current;

    const worker = workerRef.current;
    if (!worker) throw new Error('TTS Worker 未就绪');

    setInitializing(true);
    setProgress({ percent: 0, status: '准备模型…' });

    initPromiseRef.current = new Promise((resolve, reject) => {
      const handler = (ev: MessageEvent<WorkerOut>) => {
        const msg = ev.data;
        if (msg.type === 'progress') {
          setProgress({ percent: msg.percent, status: msg.status });
        } else if (msg.type === 'ready') {
          worker.removeEventListener('message', handler);
          const info = { device: msg.device, dtype: msg.dtype };
          setDeviceInfo(info);
          setInitializing(false);
          setProgress(null);
          resolve(info);
        } else if (msg.type === 'error') {
          worker.removeEventListener('message', handler);
          initPromiseRef.current = null;
          setInitializing(false);
          setProgress(null);
          reject(new Error(msg.message));
        }
      };

      worker.addEventListener('message', handler);
      void pickInferenceDevice().then((device) => worker.postMessage({ type: 'init', device }));
    });

    return initPromiseRef.current;
  }, [deviceInfo]);

  const synthesize = React.useCallback(
    async (
      text: string,
      voice: string,
      speed: number,
      onChunk: (chunk: TtsSentenceChunk) => void,
    ): Promise<number> => {
      const worker = workerRef.current;
      if (!worker) throw new Error('TTS Worker 未就绪');

      await init();
      const id = ++jobIdRef.current;
      setSynthesizing(true);
      setProgress({ percent: 0, status: '开始合成…' });

      return new Promise<number>((resolve, reject) => {
        const handler = (ev: MessageEvent<WorkerOut>) => {
          const msg = ev.data;
          if ('id' in msg && msg.id !== id) return;

          if (msg.type === 'progress') {
            setProgress({ percent: msg.percent, status: msg.status });
          } else if (msg.type === 'chunk') {
            onChunk({ index: msg.index, text: msg.text, audio: msg.audio });
          } else if (msg.type === 'complete') {
            worker.removeEventListener('message', handler);
            setSynthesizing(false);
            setProgress(null);
            resolve(msg.total);
          } else if (msg.type === 'error') {
            worker.removeEventListener('message', handler);
            setSynthesizing(false);
            setProgress(null);
            reject(new Error(msg.message));
          }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'synthesize', id, text, voice, speed });
      });
    },
    [init],
  );

  const previewVoice = React.useCallback(
    async (voice: string, speed: number): Promise<Float32Array> => {
      const worker = workerRef.current;
      if (!worker) throw new Error('TTS Worker 未就绪');

      await init();
      const id = ++jobIdRef.current;
      setProgress({ percent: 0, status: '生成试听…' });

      return new Promise<Float32Array>((resolve, reject) => {
        const handler = (ev: MessageEvent<WorkerOut>) => {
          const msg = ev.data;
          if ('id' in msg && msg.id !== id) return;

          if (msg.type === 'progress') {
            setProgress({ percent: msg.percent, status: msg.status });
          } else if (msg.type === 'preview-done') {
            worker.removeEventListener('message', handler);
            setProgress(null);
            resolve(msg.audio);
          } else if (msg.type === 'error') {
            worker.removeEventListener('message', handler);
            setProgress(null);
            reject(new Error(msg.message));
          }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'preview', id, voice, speed });
      });
    },
    [init],
  );

  const cancel = React.useCallback(() => {
    const worker = workerRef.current;
    if (!worker) return;
    const id = jobIdRef.current;
    worker.postMessage({ type: 'cancel', id });
    setSynthesizing(false);
    setProgress(null);
  }, []);

  return {
    init,
    synthesize,
    previewVoice,
    cancel,
    progress,
    initializing,
    synthesizing,
    deviceInfo,
  };
}
