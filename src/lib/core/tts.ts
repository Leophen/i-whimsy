/**
 * 本地 TTS 工具 —— 文本切分、音频拼接与编码，纯函数无 React 依赖。
 */

export const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.1-zh-ONNX';
export const KOKORO_SAMPLE_RATE = 24_000;
export const KOKORO_DTYPE = 'q8' as const;

export interface TtsVoice {
  id: string;
  name: string;
  gender: 'female' | 'male';
}

/** 精选中文音色（模型仓库 voices/ 下 zf_* 女声、zm_* 男声）。 */
export const CHINESE_VOICES: TtsVoice[] = [
  { id: 'zf_001', name: '女声 · 清澈', gender: 'female' },
  { id: 'zf_002', name: '女声 · 温柔', gender: 'female' },
  { id: 'zf_003', name: '女声 · 活泼', gender: 'female' },
  { id: 'zf_004', name: '女声 · 沉稳', gender: 'female' },
  { id: 'zf_005', name: '女声 · 甜美', gender: 'female' },
  { id: 'zm_001', name: '男声 · 标准', gender: 'male' },
  { id: 'zm_002', name: '男声 · 低沉', gender: 'male' },
  { id: 'zm_003', name: '男声 · 青年', gender: 'male' },
  { id: 'zm_004', name: '男声 · 磁性', gender: 'male' },
  { id: 'zm_005', name: '男声 · 播报', gender: 'male' },
];

export const DEFAULT_VOICE_ID = 'zf_001';
export const PREVIEW_TEXT = '你好，欢迎使用本地 AI 配音工具。';
export const DEFAULT_SAMPLE_TEXT =
  '人工智能正在改变我们的生活方式。从智能手机到自动驾驶，从医疗诊断到内容创作，AI 技术已经渗透到日常生活的方方面面。';

export interface TtsSentenceChunk {
  index: number;
  text: string;
  audio: Float32Array;
}

/** 按中英标点分句，长句再按逗号或字数切分。 */
export function splitTextForTts(text: string, maxLen = 36): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  const paragraphs = normalized.split(/\n+/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/(?<=[。！？；.!?])\s*/).filter(Boolean);
    for (const part of parts) {
      const chunk = part.trim();
      if (!chunk) continue;
      if (chunk.length <= maxLen) {
        sentences.push(chunk);
        continue;
      }

      let remaining = chunk;
      while (remaining.length > maxLen) {
        let splitAt = -1;
        for (let i = Math.min(maxLen, remaining.length - 1); i >= Math.floor(maxLen * 0.5); i--) {
          if ('，,、；;'.includes(remaining[i]!)) {
            splitAt = i + 1;
            break;
          }
        }
        if (splitAt < 0) splitAt = maxLen;
        sentences.push(remaining.slice(0, splitAt).trim());
        remaining = remaining.slice(splitAt).trim();
      }
      if (remaining) sentences.push(remaining);
    }
  }

  return sentences.filter((s) => s.length > 0);
}

export function createSilence(sampleRate: number, durationMs: number): Float32Array {
  const samples = Math.max(0, Math.round((sampleRate * durationMs) / 1000));
  return new Float32Array(samples);
}

export function concatAudioChunks(
  chunks: Float32Array[],
  sampleRate: number,
  pauseMs = 0,
): Float32Array {
  if (chunks.length === 0) return new Float32Array(0);
  if (chunks.length === 1) return chunks[0]!;

  const pause = pauseMs > 0 ? createSilence(sampleRate, pauseMs) : null;
  const total = chunks.reduce((sum, chunk, i) => {
    const gap = pause && i < chunks.length - 1 ? pause.length : 0;
    return sum + chunk.length + gap;
  }, 0);

  const out = new Float32Array(total);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    out.set(chunks[i]!, offset);
    offset += chunks[i]!.length;
    if (pause && i < chunks.length - 1) {
      out.set(pause, offset);
      offset += pause.length;
    }
  }
  return out;
}

export function audioDurationSec(samples: Float32Array, sampleRate: number): number {
  return samples.length / sampleRate;
}

export function formatAudioDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function floatTo16BitPCM(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Float32 单声道 PCM → WAV Blob。 */
export function encodeWav(samples: Float32Array, sampleRate = KOKORO_SAMPLE_RATE): Blob {
  const pcm = floatTo16BitPCM(samples);
  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length * 2, true);

  const pcmBytes = new Int16Array(buffer, 44);
  pcmBytes.set(pcm);

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Float32 单声道 PCM → MP3 Blob（lamejs，128kbps）。 */
export async function encodeMp3(
  samples: Float32Array,
  sampleRate = KOKORO_SAMPLE_RATE,
): Promise<Blob> {
  const lamejs = await import('lamejs');
  const Mp3Encoder = lamejs.Mp3Encoder;
  const pcm = floatTo16BitPCM(samples);
  const encoder = new Mp3Encoder(1, sampleRate, 128);
  const blockSize = 1152;
  const parts: Int8Array[] = [];

  for (let i = 0; i < pcm.length; i += blockSize) {
    const chunk = pcm.subarray(i, i + blockSize);
    const buf = encoder.encodeBuffer(chunk);
    if (buf.length > 0) parts.push(buf);
  }

  const end = encoder.flush();
  if (end.length > 0) parts.push(end);

  return new Blob(parts as BlobPart[], { type: 'audio/mpeg' });
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function voiceUrl(voiceId: string): string {
  return `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/voices/${voiceId}.bin`;
}
