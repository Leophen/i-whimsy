/**
 * Kokoro TTS Worker 客户端封装。
 */

import { pickInferenceDevice } from './depth';
import { formatModelLoadError, withTimeout } from './promise-utils';
import type { TtsSentenceChunk } from './tts';
import { waitForWorker } from './worker-rpc';

export interface TtsProgress {
  percent: number;
  status: string;
}

export interface TtsDeviceInfo {
  device: string;
  dtype: string;
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

/** 首次下载 Kokoro（约 92MB）+ Worker 冷启动。 */
const INIT_TIMEOUT_MS = 180_000;
const SYNTH_TIMEOUT_MS = 300_000;
const MODEL_HINT = 'Kokoro 中文 TTS 模型（约 92MB）';

let worker: Worker | null = null;
let initPromise: Promise<TtsDeviceInfo> | null = null;
let jobId = 0;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../tools/ai-voice/tts.worker.ts', import.meta.url));
  }
  return worker;
}

export async function initTtsModel(
  onProgress?: (p: TtsProgress) => void,
): Promise<TtsDeviceInfo> {
  if (initPromise) return initPromise;

  onProgress?.({ percent: 0, status: '正在启动 TTS Worker…' });

  initPromise = (async () => {
    const w = getWorker();
    const device = await pickInferenceDevice();

    const ready = waitForWorker(
      w,
      (msg) => {
        const m = msg as WorkerOut;
        return m.type === 'ready' ? { device: m.device, dtype: m.dtype } : null;
      },
      {
        timeoutMs: INIT_TIMEOUT_MS,
        timeoutMessage: `TTS 模型加载超时：${MODEL_HINT} 在 ${INIT_TIMEOUT_MS / 1000}s 内未完成。请检查网络是否能访问 Hugging Face，或配置 NEXT_PUBLIC_HF_ENDPOINT 镜像后刷新重试。`,
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

export async function synthesizeTts(
  text: string,
  voice: string,
  speed: number,
  onChunk: (chunk: TtsSentenceChunk) => void,
  onProgress?: (p: TtsProgress) => void,
): Promise<number> {
  await initTtsModel(onProgress);
  const w = getWorker();
  const id = ++jobId;

  const synthPromise = new Promise<number>((resolve, reject) => {
    const handler = (ev: MessageEvent<WorkerOut>) => {
      const msg = ev.data;
      if ('id' in msg && msg.id !== id) return;

      if (msg.type === 'progress') {
        onProgress?.({ percent: msg.percent, status: msg.status });
      } else if (msg.type === 'chunk') {
        onChunk({ index: msg.index, text: msg.text, audio: msg.audio });
      } else if (msg.type === 'complete') {
        w.removeEventListener('message', handler);
        resolve(msg.total);
      } else if (msg.type === 'error') {
        w.removeEventListener('message', handler);
        reject(new Error(formatModelLoadError(msg.message, MODEL_HINT)));
      }
    };

    w.addEventListener('message', handler);
    w.postMessage({ type: 'synthesize', id, text, voice, speed });
  });

  return withTimeout(
    synthPromise,
    SYNTH_TIMEOUT_MS,
    `语音合成超时（${SYNTH_TIMEOUT_MS / 1000}s）。请缩短文本或稍后重试。`,
  );
}

export async function previewTtsVoice(
  voice: string,
  speed: number,
  onProgress?: (p: TtsProgress) => void,
): Promise<Float32Array> {
  await initTtsModel(onProgress);
  const w = getWorker();
  const id = ++jobId;

  const previewPromise = waitForWorker(
    w,
    (msg) => {
      const m = msg as WorkerOut;
      return m.type === 'preview-done' && m.id === id ? m.audio : null;
    },
    {
      timeoutMs: 60_000,
      timeoutMessage: '音色试听超时，请检查网络后重试。',
      modelHint: MODEL_HINT,
      onProgress,
    },
  );

  w.postMessage({ type: 'preview', id, voice, speed });
  return previewPromise;
}

export function cancelTtsJob() {
  const w = worker;
  if (!w) return;
  w.postMessage({ type: 'cancel', id: jobId });
}

export function disposeTtsWorker() {
  cancelTtsJob();
  worker?.terminate();
  worker = null;
  initPromise = null;
}
