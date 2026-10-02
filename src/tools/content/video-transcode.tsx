'use client';

import * as React from 'react';
import { ChevronDown, Clapperboard, Loader2, Square } from 'lucide-react';
import { toast } from 'sonner';

import { DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { Button } from '@/components/ui/button';
import {
  CheckboxRow,
  SegmentedControl,
  Select,
  SliderRow,
  SwitchRow,
} from '@/components/ui/controls';
import { useAsyncComputed, useHydrated } from '@/lib/hooks';
import {
  buildOutputFilename,
  CODEC_LABELS,
  defaultSettings,
  detectCodecCapabilities,
  estimateOutputSizeBytes,
  formatBitrate,
  formatDuration,
  probeVideoFile,
  RESOLUTION_PRESETS,
  resolveVideoBitrate,
  transcodeVideo,
  WARN_INPUT_BYTES,
  type CodecCapabilities,
  type TranscodeProgress,
  type TranscodeResult,
  type TranscodeSettings,
} from '@/lib/core/video-transcode';
import { cn, formatBytes } from '@/lib/utils';

function CapabilityBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
        ok ? 'bg-success-subtle text-success' : 'bg-surface-3 text-subtle-foreground',
      )}
    >
      {label}
      {!ok && ' · 不可用'}
    </span>
  );
}

export default function VideoTranscode() {
  const tool = useToolMeta('video-transcode');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const [file, setFile] = React.useState<File | null>(null);
  const [settingsPatch, setSettingsPatch] = React.useState<Partial<TranscodeSettings>>({});
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [transcoding, setTranscoding] = React.useState(false);
  const [progress, setProgress] = React.useState<TranscodeProgress | null>(null);
  const [result, setResult] = React.useState<TranscodeResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const previewUrl = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const resultPreviewUrl = React.useMemo(
    () => (result ? URL.createObjectURL(result.blob) : null),
    [result],
  );

  React.useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  React.useEffect(
    () => () => {
      if (resultPreviewUrl) URL.revokeObjectURL(resultPreviewUrl);
    },
    [resultPreviewUrl],
  );

  const probeJob = useAsyncComputed(
    () => (file ? probeVideoFile(file) : Promise.resolve(null)),
    [file],
    { delay: 0, enabled: Boolean(file) },
  );

  const probe = probeJob.value;

  const baseSettings = React.useMemo((): TranscodeSettings | null => {
    if (!probe) return null;
    return { ...defaultSettings(probe), ...settingsPatch } as TranscodeSettings;
  }, [probe, settingsPatch]);

  const capsJob = useAsyncComputed(
    async (): Promise<CodecCapabilities | null> => {
      if (!hydrated || !probe) return null;
      const bitrate = baseSettings
        ? resolveVideoBitrate(baseSettings, probe.duration, probe.hasAudio)
        : undefined;
      const preset = RESOLUTION_PRESETS.find((p) => p.id === baseSettings?.resolutionPresetId);
      const longEdge = preset?.longEdge ?? Math.max(probe.width, probe.height);
      const scale = preset?.longEdge ? longEdge / Math.max(probe.width, probe.height) : 1;
      const width = Math.round(probe.width * Math.min(1, scale));
      const height = Math.round(probe.height * Math.min(1, scale));
      return detectCodecCapabilities(width, height, bitrate);
    },
    [
      hydrated,
      probe,
      baseSettings?.resolutionPresetId,
      baseSettings?.bitrateMode,
      baseSettings?.manualBitrateMbps,
      baseSettings?.targetSizeMb,
    ],
    { delay: 200, enabled: Boolean(hydrated && probe) },
  );

  const caps = capsJob.value;

  const settings = React.useMemo((): TranscodeSettings | null => {
    if (!baseSettings || !caps) return baseSettings;
    if (baseSettings.format === 'mp4' && !caps.avcMp4 && caps.vp9Webm) {
      return { ...baseSettings, format: 'webm', codec: 'vp9' as const };
    }
    if (baseSettings.format === 'webm' && !caps.vp9Webm && caps.avcMp4) {
      return { ...baseSettings, format: 'mp4', codec: 'avc' as const };
    }
    return baseSettings;
  }, [baseSettings, caps]);

  const handleFile = (f: File) => {
    setFile(f);
    setSettingsPatch({});
    setResult(null);
    setError(null);
    setProgress(null);
  };

  const clearFile = () => {
    setFile(null);
    setSettingsPatch({});
    setResult(null);
    setError(null);
    setProgress(null);
  };

  const updateSettings = (patch: Partial<TranscodeSettings>) => {
    setSettingsPatch((prev) => ({ ...prev, ...patch }));
  };

  const handleFormatChange = (format: 'mp4' | 'webm') => {
    updateSettings({
      format,
      codec: format === 'mp4' ? 'avc' : 'vp9',
    });
  };

  const estimatedBitrate =
    probe && settings
      ? resolveVideoBitrate(
          settings,
          Math.max(0.1, settings.trimEnd - settings.trimStart),
          probe.hasAudio,
        )
      : undefined;

  const estimatedSize =
    probe && settings && estimatedBitrate
      ? estimateOutputSizeBytes(
          settings.trimEnd - settings.trimStart,
          estimatedBitrate,
          settings.keepAudio && probe.hasAudio,
        )
      : probe && settings && settings.bitrateMode === 'preset'
        ? Math.round(probe.fileSize * 0.6)
        : null;

  const canStart =
    Boolean(file && probe && settings && caps?.webCodecsAvailable) &&
    !transcoding &&
    !probeJob.pending &&
    ((settings?.format === 'mp4' && caps?.avcMp4) || (settings?.format === 'webm' && caps?.vp9Webm));

  const handleTranscode = async () => {
    if (!file || !probe || !settings) return;
    setTranscoding(true);
    setError(null);
    setResult(null);
    setProgress(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const output = await transcodeVideo(
        file,
        probe,
        settings,
        (p) => setProgress(p),
        controller.signal,
      );
      setResult(output);
      toast.success('转码完成');
    } catch (err) {
      const message = err instanceof Error ? err.message : '转码失败';
      setError(message);
      if (message !== '转码已取消') toast.error(message);
    } finally {
      setTranscoding(false);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const progressPct =
    progress && progress.totalFrames > 0
      ? Math.min(100, Math.round((progress.processedFrames / progress.totalFrames) * 100))
      : 0;

  const downloadName =
    result && file ? buildOutputFilename(file.name, result.extension) : 'output.mp4';

  return (
    <ToolView
      tool={tool}
      actions={
        result ? (
          <DownloadButton data={result.blob} filename={downloadName}>
            下载 {formatBytes(result.outputSize)}
          </DownloadButton>
        ) : null
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="上传视频" description="支持 MP4 / WebM / MOV 等常见格式，文件不会离开浏览器">
              <FileDropzone
                accept="video/*"
                onFile={handleFile}
                current={file ? { name: file.name, size: file.size } : null}
                onRemove={clearFile}
              />
              {file && file.size > WARN_INPUT_BYTES && (
                <Notice tone="warning" className="mt-3">
                  文件较大（{formatBytes(file.size)}），转码可能占用较多内存并耗时较久。
                </Notice>
              )}
            </Panel>

            {probeJob.pending && (
              <Panel title="解析中">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  正在读取视频信息…
                </div>
              </Panel>
            )}

            {probeJob.error && <Notice tone="danger">{probeJob.error}</Notice>}

            {probe && (
              <Panel title="源视频信息" description="转码前确认时长、分辨率与编码格式">
                <StatGrid
                  columns={3}
                  items={[
                    { label: '时长', value: formatDuration(probe.duration) },
                    {
                      label: '分辨率',
                      value: `${probe.width}×${probe.height}`,
                    },
                    {
                      label: '体积',
                      value: formatBytes(probe.fileSize),
                      tone: 'primary',
                    },
                    {
                      label: '视频编码',
                      value: probe.videoCodec ? CODEC_LABELS[probe.videoCodec] ?? probe.videoCodec : '-',
                    },
                    {
                      label: '音频',
                      value: probe.hasAudio
                        ? CODEC_LABELS[probe.audioCodec ?? ''] ?? probe.audioCodec ?? '有'
                        : '无',
                    },
                    {
                      label: '码率',
                      value: probe.bitrate ? formatBitrate(probe.bitrate) : '-',
                      hint: `约 ${probe.frameRate.toFixed(1)} fps · ${probe.estimatedFrameCount.toLocaleString()} 帧`,
                    },
                  ]}
                />
              </Panel>
            )}

            {probe && settings && (
              <Panel title="输出设置" description="格式、分辨率与码率实时生效">
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">容器格式</span>
                    <SegmentedControl
                      value={settings.format}
                      onValueChange={(v) => handleFormatChange(v as 'mp4' | 'webm')}
                      options={[
                        { value: 'mp4', label: 'MP4 · H.264' },
                        { value: 'webm', label: 'WebM · VP9' },
                      ]}
                      full
                    />
                  </div>

                  {!caps?.webCodecsAvailable && hydrated && (
                    <Notice tone="danger">
                      当前浏览器不支持 WebCodecs（需要 Chrome 94+、Safari 16.4+ 或 Firefox 130+ 桌面版）。
                    </Notice>
                  )}

                  {caps && (
                    <div className="flex flex-wrap gap-1.5">
                      <CapabilityBadge ok={caps.avcMp4} label="H.264 编码" />
                      <CapabilityBadge ok={caps.vp9Webm} label="VP9 编码" />
                      <CapabilityBadge ok={caps.aacEncode} label="AAC 编码" />
                      <CapabilityBadge ok={caps.opusEncode} label="Opus 编码" />
                    </div>
                  )}

                  <Select
                    ariaLabel="分辨率"
                    value={settings.resolutionPresetId}
                    onValueChange={(v) => updateSettings({ resolutionPresetId: v })}
                    options={RESOLUTION_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
                  />

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">码率模式</span>
                    <SegmentedControl
                      value={settings.bitrateMode}
                      onValueChange={(v) =>
                        updateSettings({
                          bitrateMode: v as TranscodeSettings['bitrateMode'],
                        })
                      }
                      options={[
                        { value: 'preset', label: '质量预设' },
                        { value: 'manual', label: '手动码率' },
                        { value: 'targetSize', label: '目标体积' },
                      ]}
                      full
                    />
                  </div>

                  {settings.bitrateMode === 'preset' && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">质量</span>
                      <SegmentedControl
                        value={settings.qualityPreset}
                        onValueChange={(v) =>
                          updateSettings({
                            qualityPreset: v as TranscodeSettings['qualityPreset'],
                          })
                        }
                        options={[
                          { value: 'low', label: '低' },
                          { value: 'medium', label: '中' },
                          { value: 'high', label: '高' },
                        ]}
                        full
                      />
                    </div>
                  )}

                  {settings.bitrateMode === 'manual' && (
                    <SliderRow
                      label="视频码率 (Mbps)"
                      value={settings.manualBitrateMbps}
                      onChange={(v) => updateSettings({ manualBitrateMbps: v })}
                      min={0.5}
                      max={20}
                      step={0.5}
                    />
                  )}

                  {settings.bitrateMode === 'targetSize' && (
                    <SliderRow
                      label="目标体积 (MB)"
                      value={settings.targetSizeMb}
                      onChange={(v) => updateSettings({ targetSizeMb: v })}
                      min={1}
                      max={Math.max(5, Math.ceil(probe.fileSize / (1024 * 1024)))}
                      step={1}
                    />
                  )}

                  {estimatedSize && (
                    <Notice tone="info">
                      预估输出约 {formatBytes(estimatedSize)}
                      {estimatedBitrate ? `（视频码率 ${formatBitrate(estimatedBitrate)}）` : ''}
                    </Notice>
                  )}

                  <SwitchRow
                    label="保留音轨"
                    description={
                      probe.hasAudio
                        ? caps && !caps.aacEncode && settings.format === 'mp4'
                          ? 'AAC 不可用时将尝试 Opus 或透传'
                          : '能透传时不重编码'
                        : '源文件无音轨'
                    }
                    checked={settings.keepAudio && probe.hasAudio}
                    onCheckedChange={(v) => probe.hasAudio && updateSettings({ keepAudio: v })}
                  />

                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn('size-4 transition-transform', advancedOpen && 'rotate-180')}
                    />
                    裁剪与时间范围
                  </button>

                  {advancedOpen && (
                    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-2 p-4">
                      <Notice tone="info">
                        仅在关键帧边界内的裁剪可走无损 remux，任意时间点切割会触发重编码。
                      </Notice>
                      <SliderRow
                        label="起始时间"
                        value={settings.trimStart}
                        onChange={(v) =>
                          updateSettings({
                            trimStart: Math.min(v, settings.trimEnd - 0.1),
                          })
                        }
                        min={0}
                        max={probe.duration}
                        step={0.1}
                        suffix={`s · ${formatDuration(settings.trimStart)}`}
                      />
                      <SliderRow
                        label="结束时间"
                        value={settings.trimEnd}
                        onChange={(v) =>
                          updateSettings({
                            trimEnd: Math.max(v, settings.trimStart + 0.1),
                          })
                        }
                        min={0}
                        max={probe.duration}
                        step={0.1}
                        suffix={`s · ${formatDuration(settings.trimEnd)}`}
                      />
                      <CheckboxRow
                        label="启用画面裁剪"
                        checked={settings.cropEnabled}
                        onCheckedChange={(v) => updateSettings({ cropEnabled: v })}
                      />
                      {settings.cropEnabled && (
                        <>
                          <SliderRow
                            label="左边距"
                            value={settings.crop.left}
                            onChange={(v) =>
                              updateSettings({ crop: { ...settings.crop, left: v } })
                            }
                            min={0}
                            max={probe.width - 64}
                            step={2}
                            suffix="px"
                          />
                          <SliderRow
                            label="上边距"
                            value={settings.crop.top}
                            onChange={(v) =>
                              updateSettings({ crop: { ...settings.crop, top: v } })
                            }
                            min={0}
                            max={probe.height - 64}
                            step={2}
                            suffix="px"
                          />
                          <SliderRow
                            label="裁剪宽度"
                            value={settings.crop.width}
                            onChange={(v) =>
                              updateSettings({ crop: { ...settings.crop, width: v } })
                            }
                            min={64}
                            max={probe.width}
                            step={2}
                            suffix="px"
                          />
                          <SliderRow
                            label="裁剪高度"
                            value={settings.crop.height}
                            onChange={(v) =>
                              updateSettings({ crop: { ...settings.crop, height: v } })
                            }
                            min={64}
                            max={probe.height}
                            step={2}
                            suffix="px"
                          />
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button onClick={handleTranscode} disabled={!canStart}>
                      {transcoding ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          转码中…
                        </>
                      ) : (
                        <>
                          <Clapperboard className="size-4" />
                          开始转码
                        </>
                      )}
                    </Button>
                    {transcoding && (
                      <Button variant="secondary" onClick={handleCancel}>
                        <Square className="size-4" />
                        取消
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>
            )}
          </div>
        }
        output={
          <div className="flex flex-col gap-4">
            {!file && (
              <EmptyState
                icon={<Clapperboard className="size-8 text-muted-foreground" />}
                title="拖入视频开始"
                description="在浏览器内硬编硬解，调整分辨率、码率与格式，数据不上传"
              />
            )}

            {transcoding && progress && (
              <Panel title="转码进度">
                <div className="flex flex-col gap-3">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <StatGrid
                    columns={3}
                    items={[
                      {
                        label: '帧进度',
                        value: `${progress.processedFrames.toLocaleString()} / ${progress.totalFrames.toLocaleString()}`,
                        tone: 'primary',
                      },
                      {
                        label: '完成度',
                        value: `${progressPct}%`,
                      },
                      {
                        label: '速度',
                        value: `${progress.speedRatio.toFixed(1)}×`,
                        hint: `已处理 ${formatDuration(progress.processedTime)}`,
                      },
                    ]}
                  />
                </div>
              </Panel>
            )}

            {error && <Notice tone="danger">{error}</Notice>}

            {result && probe && (
              <Panel title="转码结果">
                {resultPreviewUrl && (
                  <video
                    src={resultPreviewUrl}
                    controls
                    className="mb-4 aspect-video w-full rounded-xl border border-border bg-black"
                  />
                )}
                <StatGrid
                  columns={3}
                  items={[
                    {
                      label: '原始体积',
                      value: formatBytes(result.inputSize),
                    },
                    {
                      label: '输出体积',
                      value: formatBytes(result.outputSize),
                      tone: 'success',
                    },
                    {
                      label: '压缩率',
                      value: `${Math.round((1 - result.outputSize / result.inputSize) * 100)}%`,
                      hint:
                        result.outputSize < result.inputSize
                          ? `节省 ${formatBytes(result.inputSize - result.outputSize)}`
                          : `增大 ${formatBytes(result.outputSize - result.inputSize)}`,
                    },
                  ]}
                />
                <div className="mt-4">
                  <DownloadButton data={result.blob} filename={downloadName} className="w-full sm:w-auto">
                    下载 {downloadName}
                  </DownloadButton>
                </div>
              </Panel>
            )}

            {previewUrl && !result && !transcoding && (
              <Panel title="预览">
                <video
                  src={previewUrl}
                  controls
                  className="aspect-video w-full rounded-xl border border-border bg-black"
                />
              </Panel>
            )}
          </div>
        }
      />
    </ToolView>
  );
}
