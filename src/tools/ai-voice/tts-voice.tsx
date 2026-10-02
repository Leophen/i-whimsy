'use client';

import * as React from 'react';
import { Pause, Play, RefreshCw, Square, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';

import { DownloadButton, ProgressOverlay, ResetButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Button } from '@/components/ui/button';
import { Select, SliderRow } from '@/components/ui/controls';
import {
  audioDurationSec,
  CHINESE_VOICES,
  concatAudioChunks,
  DEFAULT_SAMPLE_TEXT,
  DEFAULT_VOICE_ID,
  encodeMp3,
  encodeWav,
  formatAudioDuration,
  isMobileDevice,
  KOKORO_DTYPE,
  KOKORO_MODEL_ID,
  KOKORO_SAMPLE_RATE,
  type TtsSentenceChunk,
} from '@/lib/core/tts';
import { useHydrated } from '@/lib/hooks';
import { cn, formatBytes } from '@/lib/utils';

import { useTtsWorker } from './use-tts-worker';

const TTS_SCENES = [
  {
    id: 'documentary',
    name: '纪录片旁白',
    voice: 'zm_005',
    speed: 0.95,
    text: '在这片土地上，四季更迭，万物生长。镜头缓缓推进，记录下每一个值得铭记的瞬间。',
  },
  {
    id: 'story',
    name: '故事朗读',
    voice: 'zf_002',
    speed: 1,
    text: DEFAULT_SAMPLE_TEXT,
  },
  {
    id: 'news',
    name: '新闻播报',
    voice: 'zm_001',
    speed: 1.1,
    text: '今日要闻：科技创新持续推动产业升级，人工智能在医疗、教育、交通等领域取得新进展。',
  },
  {
    id: 'assistant',
    name: '语音助手',
    voice: 'zf_001',
    speed: 1.05,
    text: '你好，我是你的本地配音助手。所有合成都在浏览器内完成，文本不会上传到任何服务器。',
  },
];

function WaveformCanvas({
  samples,
  className,
  progress = 0,
}: {
  samples: Float32Array | null;
  className?: string;
  progress?: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'oklch(0.97 0.01 260 / 0.4)';
    ctx.fillRect(0, 0, w, h);

    if (!samples || samples.length === 0) {
      ctx.strokeStyle = 'oklch(0.7 0.02 260)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      return;
    }

    const step = Math.max(1, Math.floor(samples.length / w));
    const mid = h / 2;
    const progressX = w * progress;

    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let peak = 0;
      const start = x * step;
      for (let i = start; i < start + step && i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]!));
      }
      const barH = peak * mid * 0.9;
      ctx.moveTo(x, mid - barH);
      ctx.lineTo(x, mid + barH);
    }
    ctx.strokeStyle = 'oklch(0.55 0.15 260)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (progress > 0) {
      ctx.fillStyle = 'oklch(0.55 0.15 260 / 0.12)';
      ctx.fillRect(0, 0, progressX, h);
      ctx.strokeStyle = 'oklch(0.55 0.15 260)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, h);
      ctx.stroke();
    }
  }, [samples, progress]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={96}
      className={cn('w-full rounded-xl border border-border bg-surface-2', className)}
    />
  );
}

export default function TtsVoice() {
  const tool = useToolMeta('tts-voice');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();

  const {
    synthesize,
    previewVoice,
    cancel,
    retry,
    progress,
    initializing,
    synthesizing,
    deviceInfo,
  } = useTtsWorker();

  const [text, setText] = React.useState(DEFAULT_SAMPLE_TEXT);
  const [voice, setVoice] = React.useState(DEFAULT_VOICE_ID);
  const [activeSceneId, setActiveSceneId] = React.useState('story');
  const [speed, setSpeed] = React.useState(1);
  const [pauseMs, setPauseMs] = React.useState(300);
  const [chunks, setChunks] = React.useState<TtsSentenceChunk[]>([]);
  const [combined, setCombined] = React.useState<Float32Array | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSentence, setActiveSentence] = React.useState<number | null>(null);
  const [playbackProgress, setPlaybackProgress] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [exportMp3, setExportMp3] = React.useState<Blob | null>(null);
  const [exportingMp3, setExportingMp3] = React.useState(false);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const sourcesRef = React.useRef<AudioBufferSourceNode[]>([]);
  const playStartRef = React.useRef(0);
  const playDurationRef = React.useRef(0);
  const rafRef = React.useRef(0);

  const mobile = hydrated ? isMobileDevice() : false;
  const voiceOptions = React.useMemo(
    () => CHINESE_VOICES.map((v) => ({ value: v.id, label: v.name })),
    [],
  );

  const stopPlayback = React.useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    for (const src of sourcesRef.current) {
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    sourcesRef.current = [];
    setPlaying(false);
    setPlaybackProgress(0);
    setActiveSentence(null);
  }, []);

  const schedulePlayback = React.useCallback(
    (sentenceChunks: TtsSentenceChunk[], fromIndex = 0) => {
      stopPlayback();
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;

      const audioChunks = sentenceChunks.map((c) => c.audio);
      const full = concatAudioChunks(audioChunks, KOKORO_SAMPLE_RATE, pauseMs);
      playDurationRef.current = audioDurationSec(full, KOKORO_SAMPLE_RATE);
      playStartRef.current = ctx.currentTime;

      let nextTime = ctx.currentTime;
      const sentenceStarts: number[] = [];

      for (let i = fromIndex; i < sentenceChunks.length; i++) {
        const chunk = sentenceChunks[i]!;
        sentenceStarts.push(nextTime - ctx.currentTime);

        const buffer = ctx.createBuffer(1, chunk.audio.length, KOKORO_SAMPLE_RATE);
        buffer.copyToChannel(new Float32Array(chunk.audio), 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(nextTime);
        sourcesRef.current.push(source);

        nextTime += chunk.audio.length / KOKORO_SAMPLE_RATE;
        if (pauseMs > 0 && i < sentenceChunks.length - 1) {
          nextTime += pauseMs / 1000;
        }
      }

      setPlaying(true);

      const tick = () => {
        const elapsed = ctx.currentTime - playStartRef.current;
        const prog = playDurationRef.current > 0 ? elapsed / playDurationRef.current : 0;
        setPlaybackProgress(Math.min(1, Math.max(0, prog)));

        let currentIdx: number | null = null;
        for (let i = sentenceStarts.length - 1; i >= 0; i--) {
          if (elapsed >= sentenceStarts[i]!) {
            currentIdx = fromIndex + i;
            break;
          }
        }
        setActiveSentence(currentIdx);

        if (elapsed < playDurationRef.current) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setPlaying(false);
          setPlaybackProgress(1);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [pauseMs, stopPlayback],
  );

  const handleSynthesize = async () => {
    if (!text.trim()) {
      toast.error('请输入要合成的文字');
      return;
    }

    setError(null);
    setChunks([]);
    setCombined(null);
    setExportMp3(null);
    stopPlayback();

    const collected: TtsSentenceChunk[] = [];
    let firstChunkPlayed = false;

    try {
      await synthesize(text, voice, speed, (chunk) => {
        collected.push(chunk);
        setChunks([...collected]);

        if (!firstChunkPlayed) {
          firstChunkPlayed = true;
          schedulePlayback(collected);
        } else if (playing) {
          schedulePlayback(collected);
        }

        const audioParts = collected.map((c) => c.audio);
        setCombined(concatAudioChunks(audioParts, KOKORO_SAMPLE_RATE, pauseMs));
      });
      toast.success('合成完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '合成失败';
      setError(msg);
      toast.error(msg);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    stopPlayback();
    try {
      const audio = await previewVoice(voice, speed);
      const ctx = audioCtxRef.current ?? new AudioContext();
      audioCtxRef.current = ctx;
      const buffer = ctx.createBuffer(1, audio.length, KOKORO_SAMPLE_RATE);
      buffer.copyToChannel(new Float32Array(audio), 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPreviewing(false);
      source.start();
      sourcesRef.current = [source];
      setPlaying(true);
    } catch (err) {
      setPreviewing(false);
      toast.error(err instanceof Error ? err.message : '试听失败');
    }
  };

  const handleExportMp3 = async () => {
    if (!combined) return;
    setExportingMp3(true);
    try {
      const blob = await encodeMp3(combined, KOKORO_SAMPLE_RATE);
      setExportMp3(blob);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'MP3 编码失败');
    } finally {
      setExportingMp3(false);
    }
  };

  const wavBlob = combined ? encodeWav(combined, KOKORO_SAMPLE_RATE) : null;
  const durationSec = combined ? audioDurationSec(combined, KOKORO_SAMPLE_RATE) : 0;

  React.useEffect(() => () => stopPlayback(), [stopPlayback]);

  return (
    <ToolView
      tool={tool}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DownloadButton
            data={wavBlob}
            filename="tts-output.wav"
            mimeType="audio/wav"
            disabled={!wavBlob}
            sourceLabel="WAV"
          >
            导出 WAV
          </DownloadButton>
          {exportMp3 ? (
            <DownloadButton
              data={exportMp3}
              filename="tts-output.mp3"
              mimeType="audio/mpeg"
              sourceLabel="MP3"
            >
              导出 MP3
            </DownloadButton>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              disabled={!combined || exportingMp3}
              onClick={handleExportMp3}
            >
              {exportingMp3 ? '编码中…' : '生成 MP3'}
            </Button>
          )}
          <ResetButton
            onReset={() => {
              cancel();
              retry();
              stopPlayback();
              setText(DEFAULT_SAMPLE_TEXT);
              setVoice(DEFAULT_VOICE_ID);
              setSpeed(1);
              setPauseMs(300);
              setChunks([]);
              setCombined(null);
              setExportMp3(null);
              setError(null);
            }}
          />
        </div>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Notice tone="info">
              中文 Kokoro 模型自然度有限（偏机械感），适合草稿配音与快速试听。首次合成需从 Hugging Face 下载约
              92MB 模型，完成后会缓存到浏览器；国内环境可在部署时设置{' '}
              <code className="rounded bg-surface-3 px-1 py-0.5 text-xs">
                NEXT_PUBLIC_HF_ENDPOINT=https://hf-mirror.com
              </code>
              。
            </Notice>

            {mobile && (
              <Notice tone="warning">
                检测到移动设备：将使用 WASM 推理，速度较慢且可能因内存回收中断，建议在桌面端使用。
              </Notice>
            )}

            <Panel title="输入文本">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder="输入要转成语音的中文文本…"
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed focus:border-primary focus:ring-[3px] focus:ring-primary/20 focus:outline-none"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                按句号自动分句合成，长句会进一步切分。共 {text.trim().length} 字。
              </p>
            </Panel>

            <Panel title="音色与参数">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {TTS_SCENES.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => {
                        setActiveSceneId(scene.id);
                        setVoice(scene.voice);
                        setSpeed(scene.speed);
                        setText(scene.text);
                      }}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                        activeSceneId === scene.id
                          ? 'border-primary bg-primary-subtle/40 text-foreground'
                          : 'border-border hover:border-primary/40 hover:bg-primary-subtle/30',
                      )}
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      value={voice}
                      onValueChange={setVoice}
                      options={voiceOptions}
                      ariaLabel="选择音色"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handlePreview}
                    disabled={previewing || synthesizing || initializing}
                  >
                    <Volume2 />
                    试听
                  </Button>
                </div>

                <SliderRow
                  label="语速"
                  value={speed}
                  onChange={setSpeed}
                  min={0.5}
                  max={2}
                  step={0.05}
                  suffix="×"
                />

                <SliderRow
                  label="句间停顿"
                  value={pauseMs}
                  onChange={setPauseMs}
                  min={0}
                  max={1500}
                  step={50}
                  suffix=" ms"
                />
              </div>
            </Panel>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSynthesize}
                disabled={synthesizing || initializing || !text.trim()}
              >
                {synthesizing ? '合成中…' : initializing ? '加载模型…' : '开始合成'}
              </Button>
              {(synthesizing || playing) && (
                <Button variant="secondary" onClick={() => { cancel(); stopPlayback(); }}>
                  <Square />
                  停止
                </Button>
              )}
              {combined && !synthesizing && (
                <Button
                  variant="secondary"
                  onClick={() => (playing ? stopPlayback() : schedulePlayback(chunks))}
                >
                  {playing ? <Pause /> : <Play />}
                  {playing ? '暂停' : '播放'}
                </Button>
              )}
            </div>
          </div>
        }
        output={
          <div className="relative flex flex-col gap-4">
            <ProgressOverlay
              show={initializing || synthesizing}
              label={progress?.status ?? (initializing ? '加载模型…' : '合成中…')}
              percent={progress?.percent}
              actions={
                initializing || synthesizing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      cancel();
                      if (initializing) retry();
                    }}
                  >
                    <X className="size-3.5" />
                    取消
                  </Button>
                ) : undefined
              }
            />

            <Panel title="波形与播放">
              {!combined && !synthesizing ? (
                <EmptyState
                  title="等待合成"
                  description="输入文字后点击「开始合成」，第一句生成完即可播放。"
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <WaveformCanvas samples={combined} progress={playbackProgress} />
                  {combined && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatAudioDuration(durationSec * playbackProgress)} /{' '}
                        {formatAudioDuration(durationSec)}
                      </span>
                      <span>{chunks.length} 句</span>
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {chunks.length > 0 && (
              <Panel title="分句文本" description="播放时高亮当前句子">
                <ol className="flex max-h-48 flex-col gap-1.5 overflow-y-auto text-sm">
                  {chunks.map((chunk) => (
                    <li
                      key={chunk.index}
                      className={cn(
                        'break-words rounded-lg px-2.5 py-1.5 transition-colors',
                        activeSentence === chunk.index
                          ? 'bg-primary-subtle text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      <span className="mr-2 text-xs text-subtle-foreground">{chunk.index + 1}.</span>
                      {chunk.text}
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            {error && (
              <div className="flex flex-col gap-2">
                <Notice tone="danger">{error}</Notice>
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    retry();
                    setError(null);
                  }}
                >
                  <RefreshCw className="size-3.5" />
                  重试加载模型
                </Button>
              </div>
            )}

            <Panel title="引擎状态">
              <StatGrid
                columns={2}
                items={[
                  {
                    label: '模型',
                    value: 'Kokoro-82M-zh',
                    hint: KOKORO_MODEL_ID.split('/').pop(),
                  },
                  {
                    label: '精度',
                    value: KOKORO_DTYPE,
                    hint: '约 92MB，IndexedDB 缓存',
                  },
                  {
                    label: '推理设备',
                    value: deviceInfo
                      ? deviceInfo.device === 'webgpu'
                        ? 'WebGPU'
                        : 'WASM'
                      : hydrated
                        ? '未加载'
                        : '—',
                    hint: deviceInfo ? `dtype ${deviceInfo.dtype}` : '首次合成时加载',
                  },
                  {
                    label: '采样率',
                    value: `${KOKORO_SAMPLE_RATE / 1000} kHz`,
                    hint: '单声道',
                  },
                  ...(wavBlob
                    ? [
                        {
                          label: 'WAV 体积',
                          value: formatBytes(wavBlob.size),
                        },
                        {
                          label: '时长',
                          value: formatAudioDuration(durationSec),
                        },
                      ]
                    : []),
                ]}
              />
              {hydrated && !deviceInfo && (
                <p className="mt-3 text-xs text-muted-foreground">
                  无 WebGPU 时自动降级 WASM，仍可正常合成。
                </p>
              )}
            </Panel>
          </div>
        }
      />
    </ToolView>
  );
}
