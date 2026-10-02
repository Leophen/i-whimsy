/**
 * 音乐可视化视频 —— 频谱分析、Canvas 渲染、音视频导出，零依赖。
 */

import { generateHarmony, parseColor, rgbToHex } from './color';

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

export type VisualStyleId = 'bars' | 'circular' | 'waveform' | 'particles';
export type BackgroundMode = 'solid' | 'gradient' | 'image' | 'transparent';
export type TextPosition = 'top' | 'center' | 'bottom';

export interface VisualStyleMeta {
  id: VisualStyleId;
  name: string;
  description: string;
}

export interface ResolutionPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  portrait: boolean;
}

export interface ColorPreset {
  id: string;
  name: string;
  primary: string;
}

export interface MusicVideoText {
  title: string;
  subtitle: string;
  show: boolean;
  titleSize: number;
  subtitleSize: number;
  position: TextPosition;
}

export interface MusicVideoConfig {
  style: VisualStyleId;
  background: BackgroundMode;
  primaryColor: string;
  palette: string[];
  sensitivity: number;
  text: MusicVideoText;
  bgImage: HTMLImageElement | null;
  transparentExport: boolean;
}

export interface AudioFrameData {
  frequency: Uint8Array;
  waveform: Uint8Array;
  bassEnergy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface ExportProgress {
  phase: 'preparing' | 'rendering' | 'encoding' | 'done';
  progress: number;
  message: string;
}

export interface ExportOptions {
  buffer: AudioBuffer;
  config: MusicVideoConfig;
  resolution: ResolutionPreset;
  fps?: number;
  onProgress?: (progress: ExportProgress) => void;
  signal?: AbortSignal;
}

/* ------------------------------------------------------------------ *
 * 常量
 * ------------------------------------------------------------------ */

export const DEFAULT_FPS = 30;
export const DEFAULT_FFT_SIZE = 2048;
export const DEFAULT_SENSITIVITY = 1.4;
export const PARTICLE_POOL_SIZE = 160;

export const VISUAL_STYLES: VisualStyleMeta[] = [
  { id: 'bars', name: '条形频谱', description: '经典柱状均衡器，节奏清晰' },
  { id: 'circular', name: '圆形频谱', description: '放射状频谱环，适合封面感' },
  { id: 'waveform', name: '波形线', description: '时域波形镜像，偏极简' },
  { id: 'particles', name: '粒子爆发', description: '低频触发粒子喷发' },
];

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: '720p-h', label: '720p 横版', width: 1280, height: 720, portrait: false },
  { id: '1080p-h', label: '1080p 横版', width: 1920, height: 1080, portrait: false },
  { id: '720p-v', label: '720p 竖版 9:16', width: 720, height: 1280, portrait: true },
  { id: '1080p-v', label: '1080p 竖版 9:16', width: 1080, height: 1920, portrait: true },
];

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'violet', name: '紫电', primary: '#7b5cff' },
  { id: 'cyan', name: '青潮', primary: '#00d4aa' },
  { id: 'sunset', name: '暮光', primary: '#ff6b4a' },
  { id: 'gold', name: '鎏金', primary: '#ffc233' },
  { id: 'rose', name: '玫影', primary: '#ff4d8d' },
  { id: 'ice', name: '冰蓝', primary: '#4db8ff' },
];

export const DEFAULT_TEXT: MusicVideoText = {
  title: '曲名',
  subtitle: '艺术家',
  show: true,
  titleSize: 48,
  subtitleSize: 28,
  position: 'bottom',
};

export const DEFAULT_CONFIG: MusicVideoConfig = {
  style: 'bars',
  background: 'gradient',
  primaryColor: COLOR_PRESETS[0]!.primary,
  palette: buildPaletteFromPrimary(COLOR_PRESETS[0]!.primary),
  sensitivity: DEFAULT_SENSITIVITY,
  text: DEFAULT_TEXT,
  bgImage: null,
  transparentExport: false,
};

/* ------------------------------------------------------------------ *
 * 音频解码
 * ------------------------------------------------------------------ */

export async function decodeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }
}

/* ------------------------------------------------------------------ *
 * FFT 与帧数据
 * ------------------------------------------------------------------ */

function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  if (n <= 1) return;

  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j]!, real[i]!];
      [imag[i], imag[j]] = [imag[j]!, imag[i]!];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wLenReal = Math.cos(ang);
    const wLenImag = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wReal = 1;
      let wImag = 0;
      for (let j = 0; j < len / 2; j += 1) {
        const uReal = real[i + j]!;
        const uImag = imag[i + j]!;
        const vReal = real[i + j + len / 2]! * wReal - imag[i + j + len / 2]! * wImag;
        const vImag = real[i + j + len / 2]! * wImag + imag[i + j + len / 2]! * wReal;
        real[i + j] = uReal + vReal;
        imag[i + j] = uImag + vImag;
        real[i + j + len / 2] = uReal - vReal;
        imag[i + j + len / 2] = uImag - vImag;
        const nextWReal = wReal * wLenReal - wImag * wLenImag;
        wImag = wReal * wLenImag + wImag * wLenReal;
        wReal = nextWReal;
      }
    }
  }
}

export function computeFrameData(
  channelData: Float32Array,
  sampleRate: number,
  time: number,
  fftSize: number,
  sensitivity: number,
): AudioFrameData {
  const half = fftSize / 2;
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const start = Math.floor(time * sampleRate);

  for (let i = 0; i < fftSize; i += 1) {
    const idx = start + i;
    if (idx >= 0 && idx < channelData.length) {
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / fftSize));
      real[i] = channelData[idx]! * window;
    }
  }

  fftInPlace(real, imag);

  const frequency = new Uint8Array(half);
  let bassSum = 0;
  const bassBins = Math.max(4, Math.floor(half * 0.08));
  for (let i = 0; i < half; i += 1) {
    const mag = Math.sqrt(real[i]! * real[i]! + imag[i]! * imag[i]!);
    const normalized = Math.min(255, mag * sensitivity * 420);
    frequency[i] = normalized;
    if (i < bassBins) bassSum += normalized;
  }

  const waveform = new Uint8Array(fftSize);
  for (let i = 0; i < fftSize; i += 1) {
    const idx = start + i;
    const sample = idx >= 0 && idx < channelData.length ? channelData[idx]! : 0;
    waveform[i] = Math.round((sample + 1) * 127.5);
  }

  return {
    frequency,
    waveform,
    bassEnergy: bassSum / bassBins / 255,
  };
}

export function precomputeFrameData(
  buffer: AudioBuffer,
  fps: number,
  fftSize = DEFAULT_FFT_SIZE,
  sensitivity = DEFAULT_SENSITIVITY,
): AudioFrameData[] {
  const channelData = buffer.getChannelData(0);
  const totalFrames = Math.max(1, Math.ceil(buffer.duration * fps));
  const frames: AudioFrameData[] = [];
  for (let i = 0; i < totalFrames; i += 1) {
    frames.push(computeFrameData(channelData, buffer.sampleRate, i / fps, fftSize, sensitivity));
  }
  return frames;
}

/** 无音频时的演示帧 —— 页面一打开就有动画。 */
export function createDemoFrameData(time: number, fftSize = DEFAULT_FFT_SIZE): AudioFrameData {
  const half = fftSize / 2;
  const frequency = new Uint8Array(half);
  const waveform = new Uint8Array(fftSize);
  for (let i = 0; i < half; i += 1) {
    const t = time * 2.4 + i * 0.08;
    frequency[i] = Math.round(
      80 + Math.abs(Math.sin(t)) * 120 + Math.abs(Math.sin(t * 0.37 + 1.2)) * 55,
    );
  }
  for (let i = 0; i < fftSize; i += 1) {
    const wave = Math.sin(time * 3.5 + i * 0.04) * 0.45 + Math.sin(time * 1.1 + i * 0.015) * 0.25;
    waveform[i] = Math.round((wave + 1) * 127.5);
  }
  const bassEnergy = 0.35 + Math.abs(Math.sin(time * 4.2)) * 0.55;
  return { frequency, waveform, bassEnergy };
}

/* ------------------------------------------------------------------ *
 * 配色
 * ------------------------------------------------------------------ */

export function buildPaletteFromPrimary(primary: string): string[] {
  const parsed = parseColor(primary);
  if (!parsed) return ['#7b5cff', '#00d4aa', '#ff6eb4', '#ffe566'];
  const harmony = generateHarmony(primary, 'analogous');
  if (harmony.length >= 3) {
    return [...harmony, rgbToHex({ r: parsed.r, g: parsed.g, b: parsed.b })];
  }
  return ['#7b5cff', '#00d4aa', '#ff6eb4', '#ffe566'];
}

/* ------------------------------------------------------------------ *
 * 背景
 * ------------------------------------------------------------------ */

function drawBlurredImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / img.width, height / img.height);
  const sw = img.width * scale;
  const sh = img.height * scale;
  const sx = (width - sw) / 2;
  const sy = (height - sh) / 2;
  ctx.filter = 'blur(28px) brightness(0.45)';
  ctx.drawImage(img, sx, sy, sw, sh);
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, width, height);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: MusicVideoConfig,
): void {
  ctx.clearRect(0, 0, width, height);

  if (config.transparentExport && config.background === 'transparent') {
    return;
  }

  if (config.background === 'image' && config.bgImage) {
    drawBlurredImage(ctx, config.bgImage, width, height);
    return;
  }

  if (config.background === 'transparent') {
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (config.background === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, width, height);
    g.addColorStop(0, '#050814');
    g.addColorStop(0.45, shadeColor(config.primaryColor, -0.55));
    g.addColorStop(1, '#0a1020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.fillStyle = shadeColor(config.primaryColor, -0.72);
  ctx.fillRect(0, 0, width, height);
}

function shadeColor(hex: string, amount: number): string {
  const rgba = parseColor(hex);
  if (!rgba) return '#050814';
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  const factor = 1 + amount;
  return rgbToHex({
    r: clamp(rgba.r * factor),
    g: clamp(rgba.g * factor),
    b: clamp(rgba.b * factor),
  });
}

/* ------------------------------------------------------------------ *
 * 可视化渲染
 * ------------------------------------------------------------------ */

function pickColor(palette: string[], index: number): string {
  return palette[index % palette.length] ?? '#7b5cff';
}

export function drawBarSpectrum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: AudioFrameData,
  config: MusicVideoConfig,
): void {
  const data = frame.frequency;
  const barCount = Math.min(96, data.length);
  const gap = 2;
  const barWidth = (width - gap * (barCount - 1)) / barCount;
  const maxHeight = height * 0.55;
  const baseY = height * 0.72;

  for (let i = 0; i < barCount; i += 1) {
    const srcIdx = Math.floor((i / barCount) * data.length);
    const value = (data[srcIdx] ?? 0) / 255;
    const barHeight = value * maxHeight;
    const x = i * (barWidth + gap);
    const gradient = ctx.createLinearGradient(0, baseY - barHeight, 0, baseY);
    gradient.addColorStop(0, pickColor(config.palette, i));
    gradient.addColorStop(1, pickColor(config.palette, i + 2));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, baseY - barHeight, barWidth, barHeight, 2);
    ctx.fill();
  }
}

export function drawCircularSpectrum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: AudioFrameData,
  config: MusicVideoConfig,
): void {
  const cx = width / 2;
  const cy = height * 0.48;
  const innerR = Math.min(width, height) * 0.12;
  const outerR = Math.min(width, height) * 0.38;
  const data = frame.frequency;
  const segments = Math.min(120, data.length);

  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const nextAngle = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;
    const srcIdx = Math.floor((i / segments) * data.length);
    const value = (data[srcIdx] ?? 0) / 255;
    const r1 = innerR;
    const r2 = innerR + (outerR - innerR) * value;
    ctx.fillStyle = pickColor(config.palette, i);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
    ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
    ctx.lineTo(cx + Math.cos(nextAngle) * r2, cy + Math.sin(nextAngle) * r2);
    ctx.lineTo(cx + Math.cos(nextAngle) * r1, cy + Math.sin(nextAngle) * r1);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: AudioFrameData,
  config: MusicVideoConfig,
): void {
  const data = frame.waveform;
  const midY = height * 0.5;
  const amp = height * 0.28;
  const step = Math.max(1, Math.floor(data.length / width));

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = pickColor(config.palette, 0);
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const idx = Math.min(data.length - 1, x * step);
    const v = ((data[idx] ?? 128) - 128) / 128;
    const y = midY - v * amp;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = pickColor(config.palette, 2);
  ctx.beginPath();
  for (let x = 0; x < width; x += 1) {
    const idx = Math.min(data.length - 1, x * step);
    const v = ((data[idx] ?? 128) - 128) / 128;
    const y = midY + v * amp * 0.65;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function createParticlePool(
  count: number,
  width: number,
  height: number,
  palette: string[],
): Particle[] {
  const cx = width / 2;
  const cy = height * 0.5;
  return Array.from({ length: count }, (_, i) => ({
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 40 + (i % 30),
    size: 2 + (i % 4),
    color: pickColor(palette, i),
  }));
}

export function updateParticles(
  particles: Particle[],
  frame: AudioFrameData,
  config: MusicVideoConfig,
  width: number,
  height: number,
  dt: number,
): void {
  const cx = width / 2;
  const cy = height * 0.5;
  const burst = frame.bassEnergy * config.sensitivity;
  const spawnCount = Math.floor(burst * 6 * dt * 60);

  for (const p of particles) {
    if (p.life > 0) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= 1;
    }
  }

  let spawned = 0;
  for (const p of particles) {
    if (p.life > 0) continue;
    if (spawned >= spawnCount) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + burst * 14 + Math.random() * 4;
    p.x = cx;
    p.y = cy;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 2;
    p.life = p.maxLife;
    p.size = 2 + burst * 6 + Math.random() * 3;
    p.color = pickColor(config.palette, Math.floor(Math.random() * config.palette.length));
    spawned += 1;
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
): void {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: MusicVideoText,
): void {
  if (!text.show) return;

  let y: number;
  if (text.position === 'top') y = height * 0.12;
  else if (text.position === 'center') y = height * 0.5;
  else y = height * 0.82;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = `600 ${text.titleSize}px system-ui, sans-serif`;
  ctx.fillText(text.title, width / 2 + 2, y + 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text.title, width / 2, y);

  const subY = y + text.titleSize * 0.85;
  ctx.font = `400 ${text.subtitleSize}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(text.subtitle, width / 2, subY);
}

export function renderMusicVideoFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: AudioFrameData,
  config: MusicVideoConfig,
  particles: Particle[],
  dt: number,
): void {
  drawBackground(ctx, width, height, config);

  switch (config.style) {
    case 'bars':
      drawBarSpectrum(ctx, width, height, frame, config);
      break;
    case 'circular':
      drawCircularSpectrum(ctx, width, height, frame, config);
      break;
    case 'waveform':
      drawWaveform(ctx, width, height, frame, config);
      break;
    case 'particles':
      updateParticles(particles, frame, config, width, height, dt);
      drawParticles(ctx, particles);
      break;
    default:
      drawBarSpectrum(ctx, width, height, frame, config);
  }

  drawTextOverlay(ctx, width, height, config.text);
}

/* ------------------------------------------------------------------ *
 * 导出
 * ------------------------------------------------------------------ */

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function estimateVideoBitrate(width: number, height: number): number {
  const pixels = width * height;
  if (pixels >= 1920 * 1080) return 8_000_000;
  if (pixels >= 1280 * 720) return 4_500_000;
  return 2_500_000;
}

export function estimateExportSizeBytes(
  durationSec: number,
  width: number,
  height: number,
  _fps = DEFAULT_FPS,
): number {
  const videoBitrate = estimateVideoBitrate(width, height);
  const audioBitrate = 128_000;
  return Math.round(((videoBitrate + audioBitrate) / 8) * durationSec * 1.08);
}

export function getPreferredVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

export function isExportSupported(): boolean {
  return Boolean(getPreferredVideoMimeType());
}

/**
 * 离线预计算频谱 + 实时音视频同步录制。
 * 视频帧按 audioContext.currentTime 取样，避免 captureStream 空转掉帧。
 */
export async function exportMusicVideo(options: ExportOptions): Promise<Blob> {
  const {
    buffer,
    config,
    resolution,
    fps = DEFAULT_FPS,
    onProgress,
    signal,
  } = options;

  const mimeType = getPreferredVideoMimeType();
  if (!mimeType) throw new Error('当前浏览器不支持视频导出');

  onProgress?.({ phase: 'preparing', progress: 0, message: '预计算频谱…' });
  if (signal?.aborted) throw new Error('已取消');

  const frames = precomputeFrameData(buffer, fps, DEFAULT_FFT_SIZE, config.sensitivity);
  const exportConfig: MusicVideoConfig = {
    ...config,
    transparentExport: config.background === 'transparent' || config.transparentExport,
  };

  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');

  const particles = createParticlePool(
    PARTICLE_POOL_SIZE,
    resolution.width,
    resolution.height,
    exportConfig.palette,
  );

  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(dest);

  const videoStream = canvas.captureStream(fps);
  const combined = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const recorder = new MediaRecorder(combined, {
    mimeType,
    videoBitsPerSecond: estimateVideoBitrate(resolution.width, resolution.height),
  });

  const chunks: BlobPart[] = [];

  return new Promise<Blob>((resolve, reject) => {
    let stopped = false;
    let rafId = 0;
    let lastT = 0;

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      videoStream.getTracks().forEach((t) => t.stop());
      source.disconnect();
      void audioCtx.close();
    };

    const fail = (err: Error) => {
      if (stopped) return;
      stopped = true;
      cleanup();
      reject(err);
    };

    recorder.onerror = () => fail(new Error('录制失败'));
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      if (stopped) return;
      stopped = true;
      cleanup();
      onProgress?.({ phase: 'done', progress: 1, message: '导出完成' });
      resolve(new Blob(chunks, { type: mimeType }));
    };

    signal?.addEventListener('abort', () => {
      try {
        source.stop();
      } catch {
        /* 可能尚未 start */
      }
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        /* ignore */
      }
      fail(new Error('已取消'));
    });

    onProgress?.({ phase: 'encoding', progress: 0, message: '开始录制…' });
    recorder.start(250);
    source.start(0);
    lastT = 0;

    const tick = () => {
      if (stopped) return;
      if (signal?.aborted) return;

      const t = audioCtx.currentTime;
      const duration = buffer.duration;

      if (t >= duration) {
        onProgress?.({
          phase: 'rendering',
          progress: 1,
          message: `渲染 ${formatTime(duration)} / ${formatTime(duration)}`,
        });
        try {
          source.stop();
        } catch {
          /* ignore */
        }
        window.setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 300);
        return;
      }

      const frameIndex = Math.min(frames.length - 1, Math.floor(t * fps));
      const dt = Math.max(1 / fps, t - lastT);
      lastT = t;
      renderMusicVideoFrame(
        ctx,
        resolution.width,
        resolution.height,
        frames[frameIndex]!,
        exportConfig,
        particles,
        dt,
      );

      onProgress?.({
        phase: 'rendering',
        progress: t / duration,
        message: `渲染 ${formatTime(t)} / ${formatTime(duration)}`,
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
  });
}
