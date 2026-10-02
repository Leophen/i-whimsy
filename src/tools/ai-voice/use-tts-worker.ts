'use client';

import * as React from 'react';

import {
  cancelTtsJob,
  disposeTtsWorker,
  initTtsModel,
  previewTtsVoice,
  synthesizeTts,
  type TtsDeviceInfo,
  type TtsProgress,
} from '@/lib/core/tts-worker';
import type { TtsSentenceChunk } from '@/lib/core/tts';

export type { TtsProgress };

export function useTtsWorker() {
  const [progress, setProgress] = React.useState<TtsProgress | null>(null);
  const [initializing, setInitializing] = React.useState(false);
  const [deviceInfo, setDeviceInfo] = React.useState<TtsDeviceInfo | null>(null);
  const [synthesizing, setSynthesizing] = React.useState(false);
  const runRef = React.useRef(0);

  const init = React.useCallback(async (): Promise<TtsDeviceInfo> => {
    if (deviceInfo) return deviceInfo;
    setInitializing(true);
    setProgress({ percent: 0, status: '准备模型…' });
    try {
      const info = await initTtsModel(setProgress);
      setDeviceInfo(info);
      setProgress(null);
      return info;
    } finally {
      setInitializing(false);
    }
  }, [deviceInfo]);

  const synthesize = React.useCallback(
    async (
      text: string,
      voice: string,
      speed: number,
      onChunk: (chunk: TtsSentenceChunk) => void,
    ): Promise<number> => {
      const runId = ++runRef.current;
      setSynthesizing(true);
      setProgress({ percent: 0, status: '开始合成…' });
      try {
        const total = await synthesizeTts(text, voice, speed, (chunk) => {
          if (runRef.current === runId) onChunk(chunk);
        }, setProgress);
        if (runRef.current !== runId) return 0;
        setProgress(null);
        return total;
      } finally {
        if (runRef.current === runId) setSynthesizing(false);
      }
    },
    [],
  );

  const previewVoice = React.useCallback(async (voice: string, speed: number): Promise<Float32Array> => {
    setProgress({ percent: 0, status: '生成试听…' });
    try {
      const audio = await previewTtsVoice(voice, speed, setProgress);
      setProgress(null);
      return audio;
    } catch (err) {
      setProgress(null);
      throw err;
    }
  }, []);

  const cancel = React.useCallback(() => {
    runRef.current += 1;
    cancelTtsJob();
    setSynthesizing(false);
    setProgress(null);
  }, []);

  const retry = React.useCallback(() => {
    disposeTtsWorker();
    setDeviceInfo(null);
    setProgress(null);
    setInitializing(false);
    setSynthesizing(false);
  }, []);

  React.useEffect(() => () => disposeTtsWorker(), []);

  return {
    init,
    synthesize,
    previewVoice,
    cancel,
    retry,
    progress,
    initializing,
    synthesizing,
    deviceInfo,
  };
}
