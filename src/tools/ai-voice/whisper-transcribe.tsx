'use client';

import * as React from 'react';
import { Mic, MicOff, ShieldCheck, Upload } from 'lucide-react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { Button } from '@/components/ui/button';
import { SegmentedControl, Select } from '@/components/ui/controls';
import { pickInferenceDevice } from '@/lib/core/depth';
import {
  chunksToSrt,
  decodeAudioBlob,
  formatTimestamp,
  resampleToMono16k,
  WHISPER_MODELS,
  type TranscriptChunk,
  type WhisperModelKey,
} from '@/lib/core/whisper';
import { useHydrated } from '@/lib/hooks';
import { cn, formatBytes } from '@/lib/utils';

import { useWhisperWorker } from './use-whisper-worker';

type InputMode = 'file' | 'record';
type LanguageMode = 'auto' | 'chinese' | 'english';

const TRANSCRIBE_SCENES = [
  { id: 'meeting', name: '会议记录', model: 'base' as WhisperModelKey, lang: 'chinese' as LanguageMode },
  { id: 'draft', name: '快速草稿', model: 'tiny' as WhisperModelKey, lang: 'auto' as LanguageMode },
  { id: 'podcast', name: '英文播客', model: 'small' as WhisperModelKey, lang: 'english' as LanguageMode },
  { id: 'hq', name: '高音质', model: 'base' as WhisperModelKey, lang: 'auto' as LanguageMode },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function VolumeMeter({ level }: { level: number }) {
  const bars = 12;
  const active = Math.round(level * bars);
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 rounded-full transition-all duration-75',
            i < active ? 'bg-primary' : 'bg-surface-3',
          )}
          style={{ height: `${20 + (i / bars) * 80}%` }}
        />
      ))}
    </div>
  );
}

export default function WhisperTranscribe() {
  const tool = useToolMeta('whisper-transcribe');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const { init, transcribe, resetModel, progress, initializing, partial } = useWhisperWorker();

  const [inputMode, setInputMode] = React.useState<InputMode>('file');
  const [modelKey, setModelKey] = React.useState<WhisperModelKey>('tiny');
  const [languageMode, setLanguageMode] = React.useState<LanguageMode>('auto');
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [durationSec, setDurationSec] = React.useState(0);
  const [deviceLabel, setDeviceLabel] = React.useState<string>('检测中…');

  const [transcribing, setTranscribing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [text, setText] = React.useState('');
  const [chunks, setChunks] = React.useState<TranscriptChunk[]>([]);
  const [activeChunk, setActiveChunk] = React.useState<number | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const [recording, setRecording] = React.useState(false);
  const [volume, setVolume] = React.useState(0);
  const [micError, setMicError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!hydrated) return;
    void pickInferenceDevice().then((device) => {
      setDeviceLabel(device === 'webgpu' ? 'WebGPU 加速' : 'WASM 回退');
    });
  }, [hydrated]);

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      const idx = chunks.findIndex(
        (chunk) => t >= chunk.timestamp[0] && t <= (chunk.timestamp[1] ?? chunk.timestamp[0] + 2),
      );
      setActiveChunk(idx >= 0 ? idx : null);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => audio.removeEventListener('timeupdate', onTimeUpdate);
  }, [chunks]);

  const stopVolumeLoop = React.useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startVolumeLoop = React.useCallback(() => {
    stopVolumeLoop();
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i]!;
      setVolume(Math.min(1, sum / data.length / 180));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopVolumeLoop]);

  const cleanupRecording = React.useCallback(() => {
    stopVolumeLoop();
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioCtxRef.current?.state !== 'closed') {
      void audioCtxRef.current?.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setRecording(false);
    setVolume(0);
  }, [stopVolumeLoop]);

  React.useEffect(() => () => cleanupRecording(), [cleanupRecording]);

  const setAudioSource = React.useCallback((file: File, url: string, duration: number) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(file);
    setAudioUrl(url);
    setDurationSec(duration);
    setText('');
    setChunks([]);
    setError(null);
    setActiveChunk(null);
  }, [audioUrl]);

  const handleAudioFile = React.useCallback(
    async (file: File) => {
      try {
        const buffer = await decodeAudioBlob(file);
        const url = URL.createObjectURL(file);
        setAudioSource(file, url, buffer.duration);
      } catch {
        setError('无法解码该音频文件，请换一个常见格式（MP3 / WAV / M4A）。');
      }
    },
    [setAudioSource],
  );

  const startRecording = React.useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      const parts: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) parts.push(event.data);
      };

      recorder.onstop = async () => {
        stopVolumeLoop();
        const blob = new Blob(parts, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
        try {
          const buffer = await decodeAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioSource(file, url, buffer.duration);
        } catch {
          setError('录音解码失败，请重试。');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      startVolumeLoop();
    } catch {
      setMicError('无法访问麦克风。请确认已授权，并在 HTTPS 或 localhost 环境下使用。');
    }
  }, [setAudioSource, startVolumeLoop, stopVolumeLoop]);

  const stopRecording = React.useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    stopVolumeLoop();
  }, [stopVolumeLoop]);

  const handleTranscribe = React.useCallback(async () => {
    if (!audioFile) return;

    setTranscribing(true);
    setError(null);
    setText('');
    setChunks([]);

    try {
      const buffer = await decodeAudioBlob(audioFile);
      const samples = await resampleToMono16k(buffer);
      const device = await pickInferenceDevice();
      setDeviceLabel(device === 'webgpu' ? 'WebGPU 加速' : 'WASM 回退');

      resetModel();
      await init(modelKey, device);

      const language =
        languageMode === 'auto' ? null : languageMode === 'chinese' ? 'chinese' : 'english';

      const result = await transcribe(samples, {
        language,
        onPartial: (partialResult) => {
          setText(partialResult.text);
          setChunks(partialResult.chunks);
        },
      });

      setText(result.text);
      setChunks(result.chunks);
      setDurationSec(result.durationSec || buffer.duration);
    } catch (err) {
      setError(err instanceof Error ? err.message : '转写失败');
    } finally {
      setTranscribing(false);
    }
  }, [audioFile, init, languageMode, modelKey, resetModel, transcribe]);

  const seekToChunk = React.useCallback((chunk: TranscriptChunk) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = chunk.timestamp[0];
    void audio.play().catch(() => undefined);
  }, []);

  const displayText = transcribing && partial?.text ? partial.text : text;
  const displayChunks = transcribing && partial?.chunks?.length ? partial.chunks : chunks;
  const srtContent = chunksToSrt(displayChunks);
  const progressPct = progress?.progress ?? 0;
  const busy = transcribing || initializing;

  return (
    <ToolView
      tool={tool}
      actions={
        displayText ? (
          <>
            <CopyButton value={displayText} sourceLabel="转写文本" />
            <DownloadButton
              data={displayText}
              filename="transcript.txt"
              mimeType="text/plain;charset=utf-8"
              sourceLabel="文本"
              variant="secondary"
            >
              下载 TXT
            </DownloadButton>
            <DownloadButton
              data={srtContent}
              filename="transcript.srt"
              mimeType="application/x-subrip;charset=utf-8"
              sourceLabel="字幕"
              variant="secondary"
            >
              下载 SRT
            </DownloadButton>
          </>
        ) : undefined
      }
    >
      <Notice tone="success" className="border-success/30 bg-success-subtle/40">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
          <div>
            <p className="font-medium text-foreground">全部在本地完成，音频不会上传</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Whisper 模型在浏览器 Worker 内推理，录音与文件都只留在你的设备上。
              当前推理后端：{deviceLabel}。
            </p>
          </div>
        </div>
      </Notice>

      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="音频输入">
              <SegmentedControl
                value={inputMode}
                onValueChange={(value) => setInputMode(value as InputMode)}
                options={[
                  { value: 'file', label: '上传文件' },
                  { value: 'record', label: '麦克风录音' },
                ]}
              />

              {inputMode === 'file' ? (
                <div className="mt-4">
                  <FileDropzone
                    accept="audio/*"
                    onFile={handleAudioFile}
                    current={
                      audioFile
                        ? { name: audioFile.name, size: audioFile.size }
                        : null
                    }
                  />
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4">
                    <div>
                      <p className="text-sm font-medium">
                        {recording ? '正在录音…' : '点击开始录音'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        需要 HTTPS 与麦克风授权；录完会自动出现在播放器中。
                      </p>
                    </div>
                    <VolumeMeter level={recording ? volume : 0} />
                  </div>
                  {micError && <Notice tone="danger">{micError}</Notice>}
                  <Button
                    variant={recording ? 'danger' : 'primary'}
                    onClick={recording ? stopRecording : startRecording}
                    disabled={!hydrated || transcribing}
                  >
                    {recording ? <MicOff /> : <Mic />}
                    {recording ? '停止录音' : '开始录音'}
                  </Button>
                </div>
              )}

              {audioUrl && (
                <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
                  <audio ref={audioRef} src={audioUrl} controls className="w-full" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    时长 {formatDuration(durationSec)}
                    {audioFile ? ` · ${formatBytes(audioFile.size)}` : ''}
                  </p>
                </div>
              )}
            </Panel>

            <Panel title="模型与语言">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {TRANSCRIBE_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        setModelKey(scene.model);
                        setLanguageMode(scene.lang);
                      }}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                        modelKey === scene.model && languageMode === scene.lang
                          ? 'border-primary bg-primary-subtle/40 text-foreground'
                          : 'border-border hover:border-primary/40 hover:bg-primary-subtle/30',
                      )}
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">模型精度</p>
                  <Select
                    value={modelKey}
                    onValueChange={(value) => setModelKey(value as WhisperModelKey)}
                    options={Object.entries(WHISPER_MODELS).map(([key, model]) => ({
                      value: key,
                      label: `${model.label}（${model.size}）`,
                    }))}
                    ariaLabel="模型精度"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {WHISPER_MODELS[modelKey].note}。首次使用会从 CDN 下载并缓存到 IndexedDB。
                </p>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">语言</p>
                  <Select
                    value={languageMode}
                    onValueChange={(value) => setLanguageMode(value as LanguageMode)}
                    options={[
                      { value: 'auto', label: '自动检测' },
                      { value: 'chinese', label: '中文' },
                      { value: 'english', label: '英文' },
                    ]}
                    ariaLabel="语言"
                  />
                </div>
                <Button
                  variant="primary"
                  onClick={handleTranscribe}
                  disabled={!audioFile || busy}
                  className="w-full"
                >
                  <Upload />
                  {busy ? '转写中…' : '开始转写'}
                </Button>
                {busy && (
                  <div className="flex flex-col gap-2">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.max(4, progressPct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {progress?.status ?? '处理中…'} {progressPct > 0 ? `${progressPct}%` : ''}
                    </p>
                  </div>
                )}
                {error && <Notice tone="danger">{error}</Notice>}
              </div>
            </Panel>
          </div>
        }
        output={
          <div className="flex flex-col gap-4">
            <Panel
              title="转写文本"
              description="左侧可编辑；导出以当前文本为准。"
            >
              {!displayText && !busy ? (
                <EmptyState
                  icon={<Mic className="size-5" />}
                  title="等待音频"
                  description="上传文件或录一段音，然后点击开始转写。"
                />
              ) : (
                <textarea
                  value={displayText}
                  onChange={(event) => setText(event.target.value)}
                  rows={12}
                  className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm leading-relaxed outline-none focus:border-primary"
                  placeholder="转写结果会出现在这里…"
                />
              )}
            </Panel>

            <Panel title="时间轴字幕" description="点击条目可跳转到对应播放位置。">
              {displayChunks.length === 0 ? (
                <p className="text-sm text-muted-foreground">转写完成后会按句显示时间轴。</p>
              ) : (
                <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {displayChunks.map((chunk, index) => (
                    <li key={`${chunk.timestamp[0]}-${index}`}>
                      <button
                        type="button"
                        onClick={() => seekToChunk(chunk)}
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                          activeChunk === index
                            ? 'border-primary/40 bg-primary-subtle'
                            : 'border-border bg-surface-2 hover:bg-surface-3',
                        )}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTimestamp(chunk.timestamp[0])}
                          {' → '}
                          {formatTimestamp(chunk.timestamp[1] ?? chunk.timestamp[0])}
                        </span>
                        <p className="mt-1 break-words text-sm leading-relaxed">{chunk.text.trim()}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {displayText && (
              <StatGrid
                columns={3}
                items={[
                  { label: '段落数', value: String(displayChunks.length) },
                  { label: '字符数', value: String(displayText.length) },
                  { label: '音频时长', value: formatDuration(durationSec) },
                ]}
              />
            )}
          </div>
        }
      />
    </ToolView>
  );
}
