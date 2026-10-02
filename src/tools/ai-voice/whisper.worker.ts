/// <reference lib="webworker" />

import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

import { configureTransformersEnv } from '@/lib/core/transformers-env';
import {
  WHISPER_MODELS,
  type TranscriptChunk,
  type WhisperModelKey,
  mergeChunkResults,
  splitAudioSegments,
  WHISPER_SAMPLE_RATE,
} from '@/lib/core/whisper';

configureTransformersEnv();

type WorkerRequest =
  | { type: 'init'; id: number; model: WhisperModelKey; device: 'webgpu' | 'wasm' }
  | {
      type: 'transcribe';
      id: number;
      audio: Float32Array;
      language?: string | null;
    };

type WorkerResponse =
  | { type: 'ready'; id: number; device: string; model: string }
  | { type: 'progress'; id: number; status: string; progress: number }
  | {
      type: 'partial';
      id: number;
      chunks: TranscriptChunk[];
      text: string;
      progress: number;
    }
  | {
      type: 'result';
      id: number;
      chunks: TranscriptChunk[];
      text: string;
      durationSec: number;
    }
  | { type: 'error'; id: number; message: string };

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let activeModel: WhisperModelKey = 'tiny';
let activeDevice: 'webgpu' | 'wasm' = 'wasm';

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  self.postMessage(msg, transfer ?? []);
}

function reportProgress(id: number, progress: number, status: string) {
  post({ type: 'progress', id, progress, status });
}

async function loadTranscriber(model: WhisperModelKey, device: 'webgpu' | 'wasm', jobId: number) {
  const modelId = WHISPER_MODELS[model].id;
  return pipeline('automatic-speech-recognition', modelId, {
    device,
    dtype: device === 'webgpu' ? 'q4' : 'q8',
    progress_callback: (info: { status?: string; loaded?: number; total?: number }) => {
      if (info.status === 'progress' && info.loaded != null && info.total != null) {
        const pct = Math.min(35, Math.round((info.loaded / info.total) * 35));
        reportProgress(jobId, pct, '下载模型权重…');
      }
    },
  });
}

async function ensureModel(model: WhisperModelKey, device: 'webgpu' | 'wasm', jobId: number) {
  if (transcriber && activeModel === model && activeDevice === device) return;

  activeModel = model;
  transcriber = null;
  reportProgress(jobId, 0, '正在加载 Whisper 模型…');

  try {
    transcriber = await loadTranscriber(model, device, jobId);
    activeDevice = device;
  } catch (err) {
    if (device !== 'webgpu') throw err;
    reportProgress(jobId, 0, 'WebGPU 不可用，回退 WASM…');
    transcriber = await loadTranscriber(model, 'wasm', jobId);
    activeDevice = 'wasm';
  }
}

function normalizeChunks(output: {
  text?: string;
  chunks?: Array<{ timestamp: [number, number | null]; text: string }>;
}): TranscriptChunk[] {
  if (output.chunks?.length) {
    return output.chunks
      .map((chunk) => ({
        timestamp: [chunk.timestamp[0] ?? 0, chunk.timestamp[1] ?? chunk.timestamp[0] ?? 0] as [
          number,
          number,
        ],
        text: chunk.text,
      }))
      .filter((chunk) => chunk.text.trim());
  }

  const text = output.text?.trim();
  if (!text) return [];
  return [{ timestamp: [0, 0], text }];
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  const { id } = msg;

  try {
    if (msg.type === 'init') {
      await ensureModel(msg.model, msg.device, id);
      post({
        type: 'ready',
        id,
        device: activeDevice,
        model: WHISPER_MODELS[msg.model].id,
      });
      return;
    }

    if (msg.type === 'transcribe') {
      await ensureModel(activeModel, activeDevice, id);
      if (!transcriber) throw new Error('Whisper 模型未就绪');

      const durationSec = msg.audio.length / WHISPER_SAMPLE_RATE;
      const segments = splitAudioSegments(msg.audio, WHISPER_SAMPLE_RATE);
      const parts: Array<{ offsetSec: number; chunks: TranscriptChunk[] }> = [];

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;
        const base = 40 + Math.round((i / segments.length) * 55);
        reportProgress(id, base, `转写第 ${i + 1} / ${segments.length} 段…`);

        const output = await transcriber(segment.samples, {
          return_timestamps: true,
          chunk_length_s: 30,
          stride_length_s: 5,
          language: msg.language ?? undefined,
        });

        const normalized = normalizeChunks(output);
        parts.push({ offsetSec: segment.offsetSec, chunks: normalized });

        const merged = mergeChunkResults(parts);
        post({
          type: 'partial',
          id,
          chunks: merged,
          text: merged.map((c) => c.text.trim()).filter(Boolean).join('\n'),
          progress: base,
        });
      }

      const chunks = mergeChunkResults(parts);
      const text = chunks.map((c) => c.text.trim()).filter(Boolean).join('\n');

      post({
        type: 'result',
        id,
        chunks,
        text,
        durationSec,
      });
    }
  } catch (err) {
    post({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : '语音转写失败',
    });
  }
};
