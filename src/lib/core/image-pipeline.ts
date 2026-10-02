/**
 * 批量图像流水线 —— 纯函数层，可在 Worker 中复用。
 * 处理步骤编排、文件名模板、预设存储、OffscreenCanvas 管线。
 */

import {
  buildFilterString,
  fitDimension,
  type FilterParams,
  type OutputMime,
  type WatermarkParams,
} from './image';

/* ------------------------------------------------------------------ *
 * 步骤类型
 * ------------------------------------------------------------------ */

export type PipelineStepType = 'resize' | 'crop' | 'filter' | 'watermark' | 'format' | 'rename';

export interface PipelineStepBase {
  id: string;
  type: PipelineStepType;
  enabled: boolean;
}

export type ResizeMode = 'long-edge' | 'percentage' | 'width' | 'height' | 'exact';

export interface ResizeStep extends PipelineStepBase {
  type: 'resize';
  mode: ResizeMode;
  /** 长边像素 / 百分比 / 宽或高像素 */
  value: number;
  exactWidth?: number;
  exactHeight?: number;
}

export type CropMode = 'aspect' | 'exact';

export interface CropStep extends PipelineStepBase {
  type: 'crop';
  mode: CropMode;
  /** 宽/高 比例，如 16/9 */
  aspect?: number;
  width?: number;
  height?: number;
}

export interface FilterStep extends PipelineStepBase {
  type: 'filter';
  brightness: number;
  contrast: number;
  saturate: number;
}

export interface WatermarkStep extends PipelineStepBase {
  type: 'watermark';
  text: string;
  color: string;
  fontSize: number;
  opacity: number;
  spacing: number;
  rotation: number;
  single: boolean;
  bold: boolean;
}

export interface FormatStep extends PipelineStepBase {
  type: 'format';
  mime: OutputMime;
  quality: number;
}

export interface RenameStep extends PipelineStepBase {
  type: 'rename';
  template: string;
}

export type PipelineStep =
  | ResizeStep
  | CropStep
  | FilterStep
  | WatermarkStep
  | FormatStep
  | RenameStep;

export interface PipelineConfig {
  steps: PipelineStep[];
}

export interface PipelinePreset {
  id: string;
  name: string;
  config: PipelineConfig;
  createdAt: number;
}

export interface ProcessedImageMeta {
  width: number;
  height: number;
  mime: OutputMime;
}

/* ------------------------------------------------------------------ *
 * 默认与内置预设
 * ------------------------------------------------------------------ */

export function createStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const DEFAULT_PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'resize-1',
    type: 'resize',
    enabled: true,
    mode: 'long-edge',
    value: 1920,
  },
  {
    id: 'format-1',
    type: 'format',
    enabled: true,
    mime: 'image/jpeg',
    quality: 0.85,
  },
  {
    id: 'rename-1',
    type: 'rename',
    enabled: true,
    template: '{name}',
  },
];

export const BUILTIN_PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: 'builtin-social',
    name: '社交压缩',
    createdAt: 0,
    config: {
      steps: [
        {
          id: 'r1',
          type: 'resize',
          enabled: true,
          mode: 'long-edge',
          value: 1080,
        },
        {
          id: 'f1',
          type: 'format',
          enabled: true,
          mime: 'image/webp',
          quality: 0.85,
        },
        { id: 'n1', type: 'rename', enabled: true, template: '{name}' },
      ],
    },
  },
  {
    id: 'builtin-thumb',
    name: '缩略图',
    createdAt: 0,
    config: {
      steps: [
        {
          id: 'r1',
          type: 'resize',
          enabled: true,
          mode: 'long-edge',
          value: 400,
        },
        {
          id: 'f1',
          type: 'format',
          enabled: true,
          mime: 'image/jpeg',
          quality: 0.8,
        },
        { id: 'n1', type: 'rename', enabled: true, template: '{name}_thumb' },
      ],
    },
  },
  {
    id: 'builtin-watermark',
    name: '水印保护',
    createdAt: 0,
    config: {
      steps: [
        {
          id: 'w1',
          type: 'watermark',
          enabled: true,
          text: '© iWhimsy',
          color: '#ffffff',
          fontSize: 28,
          opacity: 35,
          spacing: 1.8,
          rotation: -22.5,
          single: false,
          bold: true,
        },
        {
          id: 'f1',
          type: 'format',
          enabled: true,
          mime: 'image/jpeg',
          quality: 0.9,
        },
        { id: 'n1', type: 'rename', enabled: true, template: '{name}' },
      ],
    },
  },
  {
    id: 'builtin-uniform',
    name: '统一宽度',
    createdAt: 0,
    config: {
      steps: [
        {
          id: 'r1',
          type: 'resize',
          enabled: true,
          mode: 'width',
          value: 1920,
        },
        {
          id: 'f1',
          type: 'format',
          enabled: true,
          mime: 'image/jpeg',
          quality: 0.88,
        },
        { id: 'n1', type: 'rename', enabled: true, template: '{name}' },
      ],
    },
  },
  {
    id: 'builtin-png',
    name: '高清 PNG',
    createdAt: 0,
    config: {
      steps: [
        {
          id: 'f1',
          type: 'format',
          enabled: true,
          mime: 'image/png',
          quality: 1,
        },
        { id: 'n1', type: 'rename', enabled: true, template: '{name}' },
      ],
    },
  },
  {
    id: 'builtin-rename',
    name: '批量重命名',
    createdAt: 0,
    config: {
      steps: [
        {
          id: 'n1',
          type: 'rename',
          enabled: true,
          template: '{name}_{index}',
        },
      ],
    },
  },
];

export const STEP_TYPE_LABELS: Record<PipelineStepType, string> = {
  resize: '缩放',
  crop: '裁剪',
  filter: '滤镜',
  watermark: '水印',
  format: '格式',
  rename: '重命名',
};

/* ------------------------------------------------------------------ *
 * 文件名模板
 * ------------------------------------------------------------------ */

export function mimeToExt(mime: OutputMime): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

export function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

export interface RenameContext {
  originalName: string;
  index: number;
  width: number;
  height: number;
  mime: OutputMime;
}

export function applyRenameTemplate(template: string, ctx: RenameContext): string {
  const base = stripExtension(ctx.originalName);
  const ext = mimeToExt(ctx.mime);
  const pad = String(ctx.index).padStart(3, '0');

  const stem = template
    .replace(/\{name\}/g, base)
    .replace(/\{index\}/g, String(ctx.index))
    .replace(/\{index_pad\}/g, pad)
    .replace(/\{width\}/g, String(ctx.width))
    .replace(/\{height\}/g, String(ctx.height))
    .replace(/\{ext\}/g, ext);

  // 模板已含扩展名则不再追加
  if (/\.(png|jpe?g|webp)$/i.test(stem)) return stem;
  return `${stem}.${ext}`;
}

export function resolveOutputFilename(
  steps: PipelineStep[],
  ctx: RenameContext,
): string {
  const renameStep = [...steps].reverse().find((s) => s.enabled && s.type === 'rename');
  const template = renameStep?.type === 'rename' ? renameStep.template : '{name}';
  return applyRenameTemplate(template, ctx);
}

export function resolveOutputFormat(steps: PipelineStep[]): {
  mime: OutputMime;
  quality: number;
} {
  const formatStep = [...steps].reverse().find((s) => s.enabled && s.type === 'format');
  if (formatStep?.type === 'format') {
    return { mime: formatStep.mime, quality: formatStep.quality };
  }
  return { mime: 'image/jpeg', quality: 0.92 };
}

/* ------------------------------------------------------------------ *
 * OffscreenCanvas 管线（Worker 可用）
 * ------------------------------------------------------------------ */

const MAX_CANVAS_SIDE = 16384;

function clampCanvasSize(w: number, h: number): { width: number; height: number } {
  const max = Math.max(w, h);
  if (max <= MAX_CANVAS_SIDE) return { width: w, height: h };
  const ratio = MAX_CANVAS_SIDE / max;
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
  };
}

function createOffscreen(w: number, h: number): OffscreenCanvas {
  const { width, height } = clampCanvasSize(w, h);
  return new OffscreenCanvas(width, height);
}

function drawBitmap(
  ctx: OffscreenCanvasRenderingContext2D,
  source: ImageBitmap | OffscreenCanvas,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source as CanvasImageSource, 0, 0, sw, sh, 0, 0, dw, dh);
}

function computeResize(
  w: number,
  h: number,
  step: ResizeStep,
): { width: number; height: number } {
  switch (step.mode) {
    case 'long-edge':
      return fitDimension(w, h, step.value);
    case 'percentage': {
      const ratio = step.value / 100;
      return {
        width: Math.max(1, Math.round(w * ratio)),
        height: Math.max(1, Math.round(h * ratio)),
      };
    }
    case 'width': {
      const ratio = step.value / w;
      return {
        width: step.value,
        height: Math.max(1, Math.round(h * ratio)),
      };
    }
    case 'height': {
      const ratio = step.value / h;
      return {
        width: Math.max(1, Math.round(w * ratio)),
        height: step.value,
      };
    }
    case 'exact':
      return {
        width: step.exactWidth ?? step.value,
        height: step.exactHeight ?? step.value,
      };
    default:
      return { width: w, height: h };
  }
}

function computeCenterCrop(
  w: number,
  h: number,
  step: CropStep,
): { x: number; y: number; width: number; height: number } {
  if (step.mode === 'exact' && step.width && step.height) {
    const cw = Math.min(step.width, w);
    const ch = Math.min(step.height, h);
    return {
      x: Math.round((w - cw) / 2),
      y: Math.round((h - ch) / 2),
      width: cw,
      height: ch,
    };
  }
  const aspect = step.aspect ?? 1;
  let cropW = w;
  let cropH = h;
  if (w / h > aspect) {
    cropW = Math.round(h * aspect);
  } else {
    cropH = Math.round(w / aspect);
  }
  return {
    x: Math.round((w - cropW) / 2),
    y: Math.round((h - cropH) / 2),
    width: cropW,
    height: cropH,
  };
}

function drawWatermarkOffscreen(
  canvas: OffscreenCanvas,
  params: WatermarkParams,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx || !params.text) return;

  const font = `${params.bold ? '700 ' : ''}${params.fontSize}px sans-serif`;
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = params.color;
  ctx.globalAlpha = params.opacity / 100;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (params.single) {
    const metrics = ctx.measureText(params.text);
    const tw = metrics.width;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((params.rotation * Math.PI) / 180);
    ctx.fillText(params.text, -tw / 2, params.fontSize / 2);
    ctx.restore();
    return;
  }

  const rad = (params.rotation * Math.PI) / 180;
  ctx.rotate(rad);
  const diag = Math.hypot(canvas.width, canvas.height);
  const textWidth = ctx.measureText(params.text).width;
  const stepX = textWidth + params.fontSize * params.spacing;
  const stepY = params.fontSize * (params.spacing + 1.4);
  const startX = -diag / 2;
  const endX = diag / 2 + stepX;
  const startY = -diag / 2;
  const endY = diag / 2 + stepY;

  for (let y = startY; y < endY; y += stepY) {
    for (let x = startX; x < endX; x += stepX) {
      ctx.fillText(params.text, x + canvas.width / 2, y + canvas.height / 2);
    }
  }
  ctx.restore();
}

async function offscreenToBlob(
  canvas: OffscreenCanvas,
  mime: OutputMime,
  quality: number,
): Promise<Blob> {
  const blob = await canvas.convertToBlob({
    type: mime,
    quality: mime === 'image/png' ? undefined : quality,
  });
  if (!blob) throw new Error('导出图片失败');
  return blob;
}

/** 在 Worker 中执行流水线（rename 步骤在此忽略，由主线程处理文件名）。 */
export async function processImagePipeline(
  source: ImageBitmap,
  steps: PipelineStep[],
  options?: { shouldCancel?: () => boolean },
): Promise<{ blob: Blob; width: number; height: number; mime: OutputMime }> {
  const activeSteps = steps.filter((s) => s.enabled && s.type !== 'rename');
  const { mime, quality } = resolveOutputFormat(steps);

  let canvas = createOffscreen(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas 上下文');
  drawBitmap(ctx, source, source.width, source.height, canvas.width, canvas.height);
  source.close();

  let w = canvas.width;
  let h = canvas.height;

  for (const step of activeSteps) {
    if (options?.shouldCancel?.()) {
      throw new Error('已取消');
    }

    if (step.type === 'resize') {
      const { width, height } = computeResize(w, h, step);
      const next = createOffscreen(width, height);
      const nctx = next.getContext('2d');
      if (!nctx) throw new Error('无法创建 Canvas 上下文');
      drawBitmap(nctx, canvas, w, h, width, height);
      w = width;
      h = height;
      canvas = next;
    } else if (step.type === 'crop') {
      const area = computeCenterCrop(w, h, step);
      const next = createOffscreen(area.width, area.height);
      const nctx = next.getContext('2d');
      if (!nctx) throw new Error('无法创建 Canvas 上下文');
      nctx.drawImage(
        canvas as CanvasImageSource,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        area.width,
        area.height,
      );
      w = area.width;
      h = area.height;
      canvas = next;
    } else if (step.type === 'filter') {
      const params: FilterParams = {
        brightness: step.brightness,
        contrast: step.contrast,
        saturate: step.saturate,
        hueRotate: 0,
        blur: 0,
        grayscale: 0,
        sepia: 0,
        invert: 0,
        opacity: 100,
      };
      const next = createOffscreen(w, h);
      const nctx = next.getContext('2d');
      if (!nctx) throw new Error('无法创建 Canvas 上下文');
      nctx.filter = buildFilterString(params);
      nctx.drawImage(canvas as CanvasImageSource, 0, 0, w, h);
      canvas = next;
    } else if (step.type === 'watermark') {
      const wm: WatermarkParams = {
        text: step.text,
        color: step.color,
        fontSize: step.fontSize,
        opacity: step.opacity,
        spacing: step.spacing,
        rotation: step.rotation,
        fontFamily: 'sans-serif',
        bold: step.bold,
        single: step.single,
      };
      drawWatermarkOffscreen(canvas, wm);
    }
    // format 在最后统一编码
  }

  const blob = await offscreenToBlob(canvas, mime, quality);
  return { blob, width: w, height: h, mime };
}

/* ------------------------------------------------------------------ *
 * IndexedDB 预设存储
 * ------------------------------------------------------------------ */

const DB_NAME = 'iwhimsy-image-pipeline';
const DB_VERSION = 1;
const STORE = 'presets';

function openPresetDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('无法打开预设数据库'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function listPipelinePresets(): Promise<PipelinePreset[]> {
  const db = await openPresetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as PipelinePreset[]).sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error ?? new Error('读取预设失败'));
    tx.oncomplete = () => db.close();
  });
}

export async function savePipelinePreset(preset: PipelinePreset): Promise<void> {
  const db = await openPresetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(preset);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('保存预设失败'));
  });
}

export async function deletePipelinePreset(id: string): Promise<void> {
  const db = await openPresetDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('删除预设失败'));
  });
}
