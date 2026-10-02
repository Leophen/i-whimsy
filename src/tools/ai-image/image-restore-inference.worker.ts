/**
 * 图像修复 ONNX 推理 Worker（LaMa / Real-ESRGAN / DDColor）。
 */

import {
  InferenceSession,
  Tensor,
  type InferenceSession as InferenceSessionType,
} from 'onnxruntime-web';

import { fetchModelWithCache } from '@/lib/core/model-cache';
import {
  RESTORE_MODELS,
  type RestoreMode,
} from '@/lib/core/image-restore';
import { configureOnnxRuntimeEnv } from '@/lib/core/onnxruntime-env';

configureOnnxRuntimeEnv();

type WorkerRequest =
  | { type: 'init'; mode: RestoreMode; device: 'webgpu' | 'wasm' }
  | {
      type: 'infer-lama';
      id: number;
      image: Float32Array;
      mask: Float32Array;
    }
  | {
      type: 'infer-esrgan';
      id: number;
      image: Float32Array;
      width: number;
      height: number;
    }
  | {
      type: 'infer-ddcolor';
      id: number;
      image: Float32Array;
      width: number;
      height: number;
    };

type WorkerResponse =
  | { type: 'progress'; percent: number; status: string }
  | { type: 'ready'; mode: RestoreMode; device: string }
  | {
      type: 'result-lama';
      id: number;
      rgb: Float32Array;
      elapsedMs: number;
    }
  | {
      type: 'result-esrgan';
      id: number;
      rgb: Float32Array;
      width: number;
      height: number;
      elapsedMs: number;
    }
  | {
      type: 'result-ddcolor';
      id: number;
      rgb: Float32Array;
      width: number;
      height: number;
      elapsedMs: number;
    }
  | { type: 'error'; message: string };

const sessions = new Map<RestoreMode, InferenceSessionType>();
let activeDevice: 'webgpu' | 'wasm' = 'wasm';

function post(msg: WorkerResponse, transfer?: Transferable[]) {
  self.postMessage(msg, transfer ?? []);
}

function reportProgress(percent: number, status: string) {
  post({ type: 'progress', percent, status });
}

function executionProviders(device: 'webgpu' | 'wasm'): string[] {
  return device === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'];
}

async function ensureSession(mode: RestoreMode, device: 'webgpu' | 'wasm') {
  const existing = sessions.get(mode);
  if (existing && activeDevice === device) return existing;

  activeDevice = device;
  sessions.delete(mode);

  const model = RESTORE_MODELS[mode];
  reportProgress(0, `正在下载 ${model.label} 模型（${model.sizeLabel}，仅首次）…`);

  const buffer = await fetchModelWithCache(model.url, (p) => {
    reportProgress(p.percent, p.status);
  });

  reportProgress(99, '正在初始化推理会话…');

  const session = await InferenceSession.create(buffer, {
    executionProviders: executionProviders(device),
    graphOptimizationLevel: 'all',
  });

  sessions.set(mode, session);
  return session;
}

function pickTensorData(output: Tensor): Float32Array {
  if (output.data instanceof Float32Array) return output.data;
  return new Float32Array(output.data as ArrayLike<number>);
}

function pickInputNames(session: InferenceSessionType): { image: string; mask?: string } {
  const names = session.inputNames;
  const image =
    names.find((n: string) => /image|input|x/i.test(n) && !/mask/i.test(n)) ?? names[0]!;
  const mask = names.find((n: string) => /mask/i.test(n));
  return { image, mask };
}

async function runLama(session: InferenceSessionType, image: Float32Array, mask: Float32Array) {
  const size = 512;
  const { image: imageName, mask: maskName } = pickInputNames(session);

  const feeds: Record<string, Tensor> = {
    [imageName]: new Tensor('float32', image, [1, 3, size, size]),
  };

  if (!maskName) {
    throw new Error('LaMa 模型缺少 mask 输入，无法执行去物体修复');
  }
  feeds[maskName] = new Tensor('float32', mask, [1, 1, size, size]);

  const outputs = await session.run(feeds);
  const key = session.outputNames[0]!;
  const tensor = outputs[key]!;
  return pickTensorData(tensor);
}

async function runEsrgan(
  session: InferenceSessionType,
  image: Float32Array,
  width: number,
  height: number,
) {
  const inputName = session.inputNames[0]!;
  const outputs = await session.run({
    [inputName]: new Tensor('float32', image, [1, 3, height, width]),
  });
  const key = session.outputNames[0]!;
  const tensor = outputs[key]!;
  const data = pickTensorData(tensor);
  const outH = (tensor.dims[2] as number | undefined) ?? height * 4;
  const outW = (tensor.dims[3] as number | undefined) ?? width * 4;
  return { data, width: outW, height: outH };
}

async function runDdcolor(
  session: InferenceSessionType,
  image: Float32Array,
  width: number,
  height: number,
) {
  const inputName = session.inputNames[0]!;
  const outputs = await session.run({
    [inputName]: new Tensor('float32', image, [1, 3, height, width]),
  });
  const key = session.outputNames[0]!;
  const tensor = outputs[key]!;
  const data = pickTensorData(tensor);
  const outH = (tensor.dims[2] as number | undefined) ?? height;
  const outW = (tensor.dims[3] as number | undefined) ?? width;
  return { data, width: outW, height: outH };
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  try {
    if (msg.type === 'init') {
      await ensureSession(msg.mode, msg.device);
      post({ type: 'ready', mode: msg.mode, device: activeDevice });
      return;
    }

    if (msg.type === 'infer-lama') {
      const session = sessions.get('inpaint') ?? (await ensureSession('inpaint', activeDevice));
      reportProgress(10, 'LaMa 推理中…');
      const started = performance.now();
      const rgb = await runLama(session, msg.image, msg.mask);
      post(
        {
          type: 'result-lama',
          id: msg.id,
          rgb,
          elapsedMs: Math.round(performance.now() - started),
        },
        [rgb.buffer],
      );
      return;
    }

    if (msg.type === 'infer-esrgan') {
      const session = sessions.get('upscale') ?? (await ensureSession('upscale', activeDevice));
      reportProgress(10, 'Real-ESRGAN 推理中…');
      const started = performance.now();
      const { data, width, height } = await runEsrgan(
        session,
        msg.image,
        msg.width,
        msg.height,
      );
      post(
        {
          type: 'result-esrgan',
          id: msg.id,
          rgb: data,
          width,
          height,
          elapsedMs: Math.round(performance.now() - started),
        },
        [data.buffer],
      );
      return;
    }

    if (msg.type === 'infer-ddcolor') {
      const session = sessions.get('colorize') ?? (await ensureSession('colorize', activeDevice));
      reportProgress(10, 'DDColor 推理中…');
      const started = performance.now();
      const { data, width, height } = await runDdcolor(
        session,
        msg.image,
        msg.width,
        msg.height,
      );
      post(
        {
          type: 'result-ddcolor',
          id: msg.id,
          rgb: data,
          width,
          height,
          elapsedMs: Math.round(performance.now() - started),
        },
        [data.buffer],
      );
      return;
    }
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : '推理失败',
    });
  }
};
