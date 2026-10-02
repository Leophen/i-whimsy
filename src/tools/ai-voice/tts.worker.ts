/**
 * Kokoro 中文 TTS Worker。
 * 模型权重走 Hugging Face CDN + IndexedDB 缓存（transformers.js env.useBrowserCache）。
 */

import {
  env,
  StyleTextToSpeech2Model,
  AutoTokenizer,
  Tensor,
  type PreTrainedTokenizer,
  type StyleTextToSpeech2Model as StyleTtsModel,
} from '@huggingface/transformers';

import {
  KOKORO_DTYPE,
  KOKORO_MODEL_ID,
  KOKORO_SAMPLE_RATE,
  splitTextForTts,
  voiceUrl,
} from '@/lib/core/tts';

type WorkerRequest =
  | { type: 'init'; device: 'webgpu' | 'wasm' }
  | {
      type: 'synthesize';
      id: number;
      text: string;
      voice: string;
      speed: number;
    }
  | { type: 'preview'; id: number; voice: string; speed: number }
  | { type: 'cancel'; id: number };

type WorkerResponse =
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

let model: StyleTtsModel | null = null;
let tokenizer: PreTrainedTokenizer | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';
const voiceCache = new Map<string, Float32Array>();
let activeJobId: number | null = null;

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  self.postMessage(msg, transfer ?? []);
}

function reportProgress(loaded: number, total: number, status: string) {
  const percent = total > 0 ? Math.min(99, Math.round((loaded / total) * 100)) : 0;
  post({ type: 'progress', percent, status });
}

async function loadVoiceEmbedding(voiceId: string): Promise<Float32Array> {
  const cached = voiceCache.get(voiceId);
  if (cached) return cached;

  post({ type: 'progress', percent: 0, status: `加载音色 ${voiceId}…` });
  const url = voiceUrl(voiceId);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`音色文件下载失败：${voiceId}`);
  const data = new Float32Array(await resp.arrayBuffer());
  voiceCache.set(voiceId, data);
  return data;
}

async function loadTtsModel(device: 'webgpu' | 'wasm') {
  const progress_callback = (info: { status?: string; loaded?: number; total?: number }) => {
    if (info.status === 'progress' && info.loaded != null && info.total != null) {
      reportProgress(info.loaded, info.total, '下载模型权重…');
    }
  };

  const [loadedModel, loadedTokenizer] = await Promise.all([
    StyleTextToSpeech2Model.from_pretrained(KOKORO_MODEL_ID, {
      dtype: KOKORO_DTYPE,
      device,
      progress_callback,
    }),
    AutoTokenizer.from_pretrained(KOKORO_MODEL_ID, { progress_callback }),
  ]);

  return { loadedModel, loadedTokenizer };
}

async function ensureModel(device: 'webgpu' | 'wasm') {
  if (model && tokenizer && activeDevice === device) return;

  env.allowLocalModels = false;
  env.useBrowserCache = true;
  env.allowRemoteModels = true;

  model = null;
  tokenizer = null;
  post({ type: 'progress', percent: 0, status: '正在加载 Kokoro 中文模型…' });

  try {
    const { loadedModel, loadedTokenizer } = await loadTtsModel(device);
    model = loadedModel;
    tokenizer = loadedTokenizer;
    activeDevice = device;
  } catch (err) {
    if (device !== 'webgpu') throw err;
    post({ type: 'progress', percent: 0, status: 'WebGPU 不可用，回退 WASM…' });
    const { loadedModel, loadedTokenizer } = await loadTtsModel('wasm');
    model = loadedModel;
    tokenizer = loadedTokenizer;
    activeDevice = 'wasm';
  }

  post({ type: 'ready', device: activeDevice, dtype: KOKORO_DTYPE });
}

async function synthesizeSentence(
  text: string,
  voice: string,
  speed: number,
): Promise<Float32Array> {
  if (!model || !tokenizer) throw new Error('模型未初始化');

  const { input_ids } = tokenizer(text, { truncation: true });
  const tokenLen = input_ids.dims.at(-1) ?? 0;
  const offset = 256 * Math.min(Math.max(tokenLen - 2, 0), 509);
  const voiceData = await loadVoiceEmbedding(voice);
  const style = voiceData.slice(offset, offset + 256);

  const inputs = {
    input_ids,
    style: new Tensor('float32', style, [1, 256]),
    speed: new Tensor('float32', [speed], [1]),
  };

  const output = await model(inputs);
  const waveform = (output as { waveform: { data: Float32Array } }).waveform;
  return waveform.data;
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'init') {
      await ensureModel(msg.device);
      return;
    }

    if (msg.type === 'cancel') {
      if (activeJobId === msg.id) activeJobId = null;
      return;
    }

    if (msg.type === 'preview') {
      await ensureModel(activeDevice);
      activeJobId = msg.id;
      const audio = await synthesizeSentence('你好，这是音色试听。', msg.voice, msg.speed);
      if (activeJobId !== msg.id) return;
      post(
        { type: 'preview-done', id: msg.id, audio, sampleRate: KOKORO_SAMPLE_RATE },
        [audio.buffer],
      );
      activeJobId = null;
      return;
    }

    if (msg.type === 'synthesize') {
      await ensureModel(activeDevice);
      activeJobId = msg.id;

      const sentences = splitTextForTts(msg.text);
      if (sentences.length === 0) {
        throw new Error('请输入要合成的文字');
      }

      for (let i = 0; i < sentences.length; i++) {
        if (activeJobId !== msg.id) return;

        const sentence = sentences[i]!;
        post({
          type: 'progress',
          percent: Math.round((i / sentences.length) * 100),
          status: `合成第 ${i + 1} / ${sentences.length} 句…`,
        });

        const audio = await synthesizeSentence(sentence, msg.voice, msg.speed);
        if (activeJobId !== msg.id) return;

        post(
          {
            type: 'chunk',
            id: msg.id,
            index: i,
            total: sentences.length,
            text: sentence,
            audio,
            sampleRate: KOKORO_SAMPLE_RATE,
          },
          [audio.buffer],
        );
      }

      if (activeJobId === msg.id) {
        post({ type: 'complete', id: msg.id, total: sentences.length });
        activeJobId = null;
      }
    }
  } catch (err) {
    activeJobId = null;
    post({
      type: 'error',
      id: 'id' in msg ? msg.id : undefined,
      message: err instanceof Error ? err.message : '语音合成失败',
    });
  }
};
