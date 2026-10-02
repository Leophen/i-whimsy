/**
 * Whisper 转写 —— 音频预处理、字幕生成与幻觉过滤。纯函数，无 React。
 */

export const WHISPER_SAMPLE_RATE = 16_000;

export const WHISPER_MODELS = {
  tiny: { id: 'Xenova/whisper-tiny', label: 'Tiny', size: '约 40MB', note: '速度快，适合会议草稿' },
  base: {
    id: 'Xenova/whisper-base',
    label: 'Base',
    size: '约 80MB',
    note: '精度更高，适合正式字幕',
  },
} as const;

export type WhisperModelKey = keyof typeof WHISPER_MODELS;

export interface TranscriptChunk {
  timestamp: [number, number];
  text: string;
}

export interface TranscriptResult {
  text: string;
  chunks: TranscriptChunk[];
  durationSec: number;
}

const HALLUCINATION_PATTERNS = [
  /请不吝点赞/,
  /订阅.*转发/,
  /打赏支持/,
  /明镜与点点/,
  /字幕由.{0,12}提供/,
  /谢谢大家收看/,
  /感谢观看/,
  /欢迎订阅/,
  /amara\.org/i,
  /subtitle/i,
];

/** 解码任意音频 Blob 为 AudioBuffer。 */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }
}

/** 混音为单声道并重采样到 16kHz，供 Whisper 推理。 */
export async function resampleToMono16k(buffer: AudioBuffer): Promise<Float32Array> {
  const targetRate = WHISPER_SAMPLE_RATE;
  const length = Math.max(1, Math.ceil(buffer.duration * targetRate));
  const offline = new OfflineAudioContext(1, length, targetRate);
  const source = offline.createBufferSource();

  const mono = offline.createBuffer(1, buffer.length, buffer.sampleRate);
  const monoData = mono.getChannelData(0);
  const channels = buffer.numberOfChannels;

  if (channels === 1) {
    monoData.set(buffer.getChannelData(0));
  } else {
    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) sum += buffer.getChannelData(c)[i]!;
      monoData[i] = sum / channels;
    }
  }

  source.buffer = mono;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return new Float32Array(rendered.getChannelData(0));
}

/** 把 AudioBuffer 转成可播放的 WAV Blob。 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  return new Blob([header, pcm], { type: 'audio/wav' });
}

export function formatSrtTime(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatTimestamp(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function chunksToText(chunks: TranscriptChunk[]): string {
  return chunks
    .map((c) => c.text.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function chunksToSrt(chunks: TranscriptChunk[]): string {
  const lines: string[] = [];
  let index = 1;

  for (const chunk of chunks) {
    const text = chunk.text.trim();
    if (!text) continue;
    const start = chunk.timestamp[0] ?? 0;
    const end = chunk.timestamp[1] ?? start + 2;
    lines.push(
      String(index),
      `${formatSrtTime(start)} --> ${formatSrtTime(end)}`,
      text,
      '',
    );
    index += 1;
  }

  return lines.join('\n').trim();
}

/** 过滤 Whisper 在静音段常见的复读幻觉。 */
export function filterHallucinations(chunks: TranscriptChunk[]): TranscriptChunk[] {
  const filtered = chunks.filter((chunk) => {
    const text = chunk.text.trim();
    if (!text) return false;
    return !HALLUCINATION_PATTERNS.some((pattern) => pattern.test(text));
  });

  const result: TranscriptChunk[] = [];
  let lastNorm = '';

  for (const chunk of filtered) {
    const norm = chunk.text.trim().replace(/\s+/g, '');
    if (norm && norm === lastNorm) continue;
    lastNorm = norm;
    result.push(chunk);
  }

  return result;
}

export function mergeChunkResults(
  parts: Array<{ offsetSec: number; chunks: TranscriptChunk[] }>,
): TranscriptChunk[] {
  const merged: TranscriptChunk[] = [];

  for (const part of parts) {
    for (const chunk of part.chunks) {
      const start = (chunk.timestamp[0] ?? 0) + part.offsetSec;
      const end = (chunk.timestamp[1] ?? chunk.timestamp[0] ?? 0) + part.offsetSec;
      merged.push({
        timestamp: [start, end],
        text: chunk.text,
      });
    }
  }

  return filterHallucinations(merged);
}

export function buildTranscriptResult(chunks: TranscriptChunk[], durationSec: number): TranscriptResult {
  const cleaned = filterHallucinations(chunks);
  return {
    text: chunksToText(cleaned),
    chunks: cleaned,
    durationSec,
  };
}

export interface AudioSegment {
  offsetSec: number;
  samples: Float32Array;
}

/** 固定窗口切分，段间保留重叠避免切字。 */
export function splitAudioSegments(
  audio: Float32Array,
  sampleRate: number,
  chunkSec = 30,
  strideSec = 5,
): AudioSegment[] {
  const chunkSamples = Math.floor(chunkSec * sampleRate);
  const stepSamples = Math.max(1, Math.floor((chunkSec - strideSec) * sampleRate));
  const segments: AudioSegment[] = [];

  for (let start = 0; start < audio.length; start += stepSamples) {
    const end = Math.min(start + chunkSamples, audio.length);
    segments.push({
      offsetSec: start / sampleRate,
      samples: audio.subarray(start, end),
    });
    if (end >= audio.length) break;
  }

  return segments;
}
