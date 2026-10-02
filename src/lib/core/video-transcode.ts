/**
 * 浏览器端视频转码：mediabunny + WebCodecs。
 * 纯算法与异步流程，不含 React。
 */

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  canEncodeAudio,
  canEncodeVideo,
  Conversion,
  ConversionCanceledError,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  type CropRectangle,
  type VideoCodec,
  type VideoSample,
} from 'mediabunny';

/* ------------------------------------------------------------------ *
 * 类型与常量
 * ------------------------------------------------------------------ */

export const MAX_INPUT_BYTES = 500 * 1024 * 1024;
export const WARN_INPUT_BYTES = 200 * 1024 * 1024;

export type OutputFormatId = 'mp4' | 'webm';
export type VideoCodecId = 'avc' | 'vp9';

export interface ResolutionPreset {
  id: string;
  label: string;
  longEdge: number | null;
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: 'original', label: '原始', longEdge: null },
  { id: '1080p', label: '1080p', longEdge: 1920 },
  { id: '720p', label: '720p', longEdge: 1280 },
  { id: '480p', label: '480p', longEdge: 854 },
  { id: '360p', label: '360p', longEdge: 640 },
];

export const CODEC_LABELS: Record<string, string> = {
  avc: 'H.264',
  hevc: 'H.265',
  vp9: 'VP9',
  vp8: 'VP8',
  av1: 'AV1',
  aac: 'AAC',
  opus: 'Opus',
  mp3: 'MP3',
  vorbis: 'Vorbis',
  flac: 'FLAC',
};

export interface VideoProbeInfo {
  duration: number;
  width: number;
  height: number;
  videoCodec: string | null;
  audioCodec: string | null;
  hasAudio: boolean;
  bitrate: number | null;
  frameRate: number;
  estimatedFrameCount: number;
  fileSize: number;
  fileName: string;
}

export interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type BitrateMode = 'preset' | 'manual' | 'targetSize';

export interface TranscodeSettings {
  format: OutputFormatId;
  codec: VideoCodecId;
  resolutionPresetId: string;
  bitrateMode: BitrateMode;
  qualityPreset: 'low' | 'medium' | 'high';
  manualBitrateMbps: number;
  targetSizeMb: number;
  keepAudio: boolean;
  trimStart: number;
  trimEnd: number;
  cropEnabled: boolean;
  crop: CropRegion;
}

export interface TranscodeProgress {
  processedFrames: number;
  totalFrames: number;
  processedTime: number;
  speedRatio: number;
  phase: 'transcoding';
}

export interface CodecCapabilities {
  webCodecsAvailable: boolean;
  avcMp4: boolean;
  vp9Webm: boolean;
  aacEncode: boolean;
  opusEncode: boolean;
}

export interface TranscodeResult {
  blob: Blob;
  mimeType: string;
  extension: string;
  outputSize: number;
  inputSize: number;
  durationSec: number;
}

/* ------------------------------------------------------------------ *
 * 工具函数
 * ------------------------------------------------------------------ */

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatBitrate(bps: number): string {
  if (!Number.isFinite(bps) || bps <= 0) return '-';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1000)} kbps`;
}

export function ensureEven(value: number): number {
  const n = Math.max(2, Math.round(value));
  return n % 2 === 0 ? n : n - 1;
}

export function computeScaledDimensions(
  srcWidth: number,
  srcHeight: number,
  longEdge: number | null,
): { width: number; height: number } {
  if (!longEdge || longEdge <= 0) {
    return { width: ensureEven(srcWidth), height: ensureEven(srcHeight) };
  }
  const maxDim = Math.max(srcWidth, srcHeight);
  if (maxDim <= longEdge) {
    return { width: ensureEven(srcWidth), height: ensureEven(srcHeight) };
  }
  const scale = longEdge / maxDim;
  return {
    width: ensureEven(srcWidth * scale),
    height: ensureEven(srcHeight * scale),
  };
}

export function computeBitrateForTargetSize(
  targetBytes: number,
  durationSec: number,
  hasAudio: boolean,
  overhead = 0.08,
): number {
  if (durationSec <= 0 || targetBytes <= 0) return 1_000_000;
  const audioBps = hasAudio ? 128_000 : 0;
  const usableBits = targetBytes * 8 * (1 - overhead);
  const videoBits = Math.max(usableBits - audioBps * durationSec, 100_000);
  return Math.round(videoBits / durationSec);
}

export function estimateOutputSizeBytes(
  durationSec: number,
  videoBitrate: number,
  hasAudio: boolean,
): number {
  const audioBps = hasAudio ? 128_000 : 0;
  return Math.round(((videoBitrate + audioBps) * durationSec) / 8);
}

export function defaultCropRegion(width: number, height: number): CropRegion {
  return { left: 0, top: 0, width: ensureEven(width), height: ensureEven(height) };
}

export function defaultSettings(probe: VideoProbeInfo): TranscodeSettings {
  const format: OutputFormatId = probe.videoCodec === 'vp9' || probe.videoCodec === 'vp8' ? 'webm' : 'mp4';
  return {
    format,
    codec: format === 'webm' ? 'vp9' : 'avc',
    resolutionPresetId: 'original',
    bitrateMode: 'preset',
    qualityPreset: 'medium',
    manualBitrateMbps: 4,
    targetSizeMb: Math.max(1, Math.round(probe.fileSize / (1024 * 1024) * 0.5)),
    keepAudio: probe.hasAudio,
    trimStart: 0,
    trimEnd: probe.duration,
    cropEnabled: false,
    crop: defaultCropRegion(probe.width, probe.height),
  };
}

export function resolveVideoBitrate(
  settings: TranscodeSettings,
  trimDuration: number,
  hasAudio: boolean,
): number | undefined {
  if (settings.bitrateMode === 'manual') {
    return Math.round(settings.manualBitrateMbps * 1_000_000);
  }
  if (settings.bitrateMode === 'targetSize') {
    return computeBitrateForTargetSize(
      settings.targetSizeMb * 1024 * 1024,
      trimDuration,
      settings.keepAudio && hasAudio,
    );
  }
  return undefined;
}

export function resolveQuality(
  settings: TranscodeSettings,
  trimDuration: number,
  hasAudio: boolean,
): Quality {
  if (settings.bitrateMode === 'preset') {
    return new Quality(settings.qualityPreset);
  }
  const bitrate = resolveVideoBitrate(settings, trimDuration, hasAudio);
  return new Quality({ bitrate, bitrateMode: 'variable' });
}

export function isWebCodecsAvailable(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

export async function probeVideoEncoderConfig(
  codec: VideoCodecId,
  width: number,
  height: number,
  bitrate?: number,
): Promise<boolean> {
  if (!isWebCodecsAvailable()) return false;
  const codecString = codec === 'avc' ? 'avc1.42E01E' : 'vp09.00.10.08';
  try {
    const config: VideoEncoderConfig = {
      codec: codecString,
      width: ensureEven(width),
      height: ensureEven(height),
      bitrate: bitrate ?? 2_000_000,
      framerate: 30,
    };
    const support = await VideoEncoder.isConfigSupported(config);
    return support.supported === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * 探测与能力
 * ------------------------------------------------------------------ */

export async function probeVideoFile(file: File): Promise<VideoProbeInfo> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`文件超过 ${Math.round(MAX_INPUT_BYTES / (1024 * 1024))}MB 上限，请先裁剪或压缩`);
  }

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  const duration = await input.computeDuration();
  const videoTrack = await input.getPrimaryVideoTrack();
  const audioTrack = await input.getPrimaryAudioTrack();

  if (!videoTrack) {
    throw new Error('未检测到视频轨，请上传包含画面的视频文件');
  }

  const width = await videoTrack.getDisplayWidth();
  const height = await videoTrack.getDisplayHeight();
  const videoCodec = await videoTrack.getCodec();
  const audioCodec = audioTrack ? await audioTrack.getCodec() : null;

  const [videoStats, audioStats, frameMetrics] = await Promise.all([
    videoTrack.computePacketStats(256),
    audioTrack?.computePacketStats(64) ?? Promise.resolve(null),
    videoTrack.computeFrameRateMetrics({ targetPacketCount: 256 }),
  ]);

  const videoBps = videoStats.averageBitrate;
  const audioBps = audioStats?.averageBitrate ?? 0;
  const bitrate = videoBps + audioBps > 0 ? videoBps + audioBps : null;
  const frameRate = frameMetrics.bestGuessFrameRate || videoStats.averagePacketRate || 30;
  const estimatedFrameCount = Math.max(1, Math.round(duration * frameRate));

  return {
    duration,
    width,
    height,
    videoCodec,
    audioCodec,
    hasAudio: Boolean(audioTrack),
    bitrate,
    frameRate,
    estimatedFrameCount,
    fileSize: file.size,
    fileName: file.name,
  };
}

export async function detectCodecCapabilities(
  width: number,
  height: number,
  bitrate?: number,
): Promise<CodecCapabilities> {
  const quality = bitrate ? new Quality({ bitrate, bitrateMode: 'variable' }) : new Quality('medium');
  const [avcMp4, vp9Webm, aacEncode, opusEncode] = await Promise.all([
    canEncodeVideo('avc', { width, height, quality }),
    canEncodeVideo('vp9', { width, height, quality }),
    canEncodeAudio('aac', { numberOfChannels: 2, sampleRate: 48_000, quality: new Quality('medium') }),
    canEncodeAudio('opus', { numberOfChannels: 2, sampleRate: 48_000, quality: new Quality('medium') }),
  ]);

  const avcDirect = await probeVideoEncoderConfig('avc', width, height, bitrate);
  const vp9Direct = await probeVideoEncoderConfig('vp9', width, height, bitrate);

  return {
    webCodecsAvailable: isWebCodecsAvailable(),
    avcMp4: avcMp4 && avcDirect,
    vp9Webm: vp9Webm && vp9Direct,
    aacEncode,
    opusEncode,
  };
}

function needsTranscode(
  probe: VideoProbeInfo,
  settings: TranscodeSettings,
  targetWidth: number,
  targetHeight: number,
): boolean {
  const preset = RESOLUTION_PRESETS.find((p) => p.id === settings.resolutionPresetId);
  const resized =
    preset?.longEdge !== null &&
    (targetWidth !== ensureEven(probe.width) || targetHeight !== ensureEven(probe.height));
  const codecChanged = settings.codec !== probe.videoCodec;
  const formatChanged =
    (settings.format === 'mp4' && probe.videoCodec === 'vp9') ||
    (settings.format === 'webm' && probe.videoCodec === 'avc');
  const bitrateChanged = settings.bitrateMode !== 'preset';
  const cropChanged = settings.cropEnabled;
  return resized || codecChanged || formatChanged || bitrateChanged || cropChanged;
}

function toCropRectangle(region: CropRegion, maxWidth: number, maxHeight: number): CropRectangle {
  const left = Math.max(0, Math.min(region.left, maxWidth - 2));
  const top = Math.max(0, Math.min(region.top, maxHeight - 2));
  const width = ensureEven(Math.min(region.width, maxWidth - left));
  const height = ensureEven(Math.min(region.height, maxHeight - top));
  return { left, top, width, height };
}

/* ------------------------------------------------------------------ *
 * 转码
 * ------------------------------------------------------------------ */

export async function transcodeVideo(
  file: File,
  probe: VideoProbeInfo,
  settings: TranscodeSettings,
  onProgress: (progress: TranscodeProgress) => void,
  signal?: AbortSignal,
): Promise<TranscodeResult> {
  const preset = RESOLUTION_PRESETS.find((p) => p.id === settings.resolutionPresetId) ?? RESOLUTION_PRESETS[0];
  const { width: targetWidth, height: targetHeight } = computeScaledDimensions(
    probe.width,
    probe.height,
    preset.longEdge,
  );

  const trimStart = Math.max(0, Math.min(settings.trimStart, probe.duration));
  const trimEnd = Math.max(trimStart + 0.05, Math.min(settings.trimEnd, probe.duration));
  const trimDuration = trimEnd - trimStart;
  const totalFrames = Math.max(1, Math.round(trimDuration * probe.frameRate));

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  const target = new BufferTarget();
  const output = new Output({
    format: settings.format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
    target,
  });

  const transcode = needsTranscode(probe, settings, targetWidth, targetHeight);
  const quality = resolveQuality(settings, trimDuration, probe.hasAudio);

  let processedFrames = 0;
  const startPerf = performance.now();

  const videoOptions = {
    codec: settings.codec as VideoCodec,
    width: targetWidth,
    height: targetHeight,
    fit: 'contain' as const,
    quality,
    forceTranscode: transcode,
    ...(settings.cropEnabled
      ? { crop: toCropRectangle(settings.crop, probe.width, probe.height) }
      : {}),
    process: (sample: VideoSample) => {
      processedFrames += 1;
      const elapsed = Math.max(0.001, (performance.now() - startPerf) / 1000);
      const processedTime = processedFrames / probe.frameRate;
      onProgress({
        processedFrames: Math.min(processedFrames, totalFrames),
        totalFrames,
        processedTime,
        speedRatio: processedTime / elapsed,
        phase: 'transcoding',
      });
      return sample;
    },
  };

  const audioOptions = settings.keepAudio && probe.hasAudio ? {} : { discard: true };

  const conversion = await Conversion.init({
    input,
    output,
    video: videoOptions,
    audio: audioOptions,
    trim: trimStart > 0 || trimEnd < probe.duration ? { start: trimStart, end: trimEnd } : undefined,
    copy: transcode ? false : { mode: 'preferred', boundaryPolicy: 'expand' },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    const reasons = conversion.discardedTracks.map((t) => t.reason).join(', ');
    throw new Error(`当前设置无法转码：${reasons || '编码器或容器不支持'}`);
  }

  const abortHandler = () => {
    void conversion.cancel();
  };
  signal?.addEventListener('abort', abortHandler);

  conversion.onProgress = (_progress, processedTime) => {
    const elapsed = Math.max(0.001, (performance.now() - startPerf) / 1000);
    const framesFromTime = Math.round(processedTime * probe.frameRate);
    const frames = Math.max(processedFrames, framesFromTime);
    onProgress({
      processedFrames: Math.min(frames, totalFrames),
      totalFrames,
      processedTime,
      speedRatio: processedTime / elapsed,
      phase: 'transcoding',
    });
  };

  try {
    await conversion.execute();
  } catch (err) {
    if (err instanceof ConversionCanceledError || signal?.aborted) {
      throw new Error('转码已取消');
    }
    throw err;
  } finally {
    signal?.removeEventListener('abort', abortHandler);
  }

  const buffer = target.buffer;
  if (!buffer) {
    throw new Error('转码完成但未生成输出文件');
  }

  const mimeType = settings.format === 'mp4' ? 'video/mp4' : 'video/webm';
  const blob = new Blob([buffer], { type: mimeType });

  return {
    blob,
    mimeType,
    extension: settings.format === 'mp4' ? 'mp4' : 'webm',
    outputSize: blob.size,
    inputSize: file.size,
    durationSec: trimDuration,
  };
}

export function buildOutputFilename(inputName: string, extension: string): string {
  const base = inputName.replace(/\.[^.]+$/, '');
  return `${base}.${extension}`;
}
