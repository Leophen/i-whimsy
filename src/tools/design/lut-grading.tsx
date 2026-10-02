'use client';

import * as React from 'react';

import { BusyOverlay, DownloadButton } from '@/components/tool/bits';
import { CompareSlider } from '@/components/tool/compare-slider';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow } from '@/components/ui/controls';
import { useAsyncComputed, useHydrated } from '@/lib/hooks';
import { loadImageFromSrc } from '@/lib/core/image';
import {
  BUILTIN_LUT_PRESETS,
  DEFAULT_ADJUSTMENTS,
  computeLabStatsFromImage,
  generatePresetLut,
  gradeImage,
  isWebGL2Available,
  parseCubeLut,
  type GradeAdjustments,
  type GradeOptions,
  type Lut3D,
} from '@/lib/core/lut';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ *
 * 预设卡片
 * ------------------------------------------------------------------ */

function PresetCard({
  name,
  preview,
  thumbnail,
  active,
  onClick,
}: {
  name: string;
  preview: [string, string];
  thumbnail?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border text-left transition-all',
        active
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border hover:border-border-strong',
      )}
    >
      <div
        className="aspect-[3/2] w-full bg-cover bg-center"
        style={
          thumbnail
            ? { backgroundImage: `url(${thumbnail})` }
            : { background: `linear-gradient(135deg, ${preview[0]}, ${preview[1]})` }
        }
      />
      <span className="px-2 py-1.5 text-xs font-medium">{name}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * 主组件
 * ------------------------------------------------------------------ */

export default function LutGrading() {
  const tool = useToolMeta('lut-grading');
  useTrackRecent(tool.slug);
  const hydrated = useHydrated();
  const webglOk = hydrated ? isWebGL2Available() : true;

  const sourceRef = React.useRef<HTMLImageElement | null>(null);
  const refImageRef = React.useRef<HTMLImageElement | null>(null);

  const [sourceFile, setSourceFile] = React.useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = React.useState<{
    name: string;
    size: number;
    url: string;
  } | null>(null);

  const [refFile, setRefFile] = React.useState<File | null>(null);
  const [refPreview, setRefPreview] = React.useState<{
    name: string;
    size: number;
    url: string;
  } | null>(null);

  const [mode, setMode] = React.useState<'lut' | 'transfer'>('lut');
  const [presetId, setPresetId] = React.useState('cinematic');
  const [customLut, setCustomLut] = React.useState<Lut3D | null>(null);
  const [lutLabel, setLutLabel] = React.useState<string>('电影青橙');

  const [adjustments, setAdjustments] = React.useState<GradeAdjustments>(DEFAULT_ADJUSTMENTS);
  const [strength, setStrength] = React.useState(100);
  const [transferStrength, setTransferStrength] = React.useState(100);

  const [presetThumbs, setPresetThumbs] = React.useState<Record<string, string>>({});
  const [adjustmentsOpen, setAdjustmentsOpen] = React.useState(false);

  const activeLut = React.useMemo(() => {
    if (customLut) return customLut;
    return generatePresetLut(presetId || 'cinematic');
  }, [customLut, presetId]);

  const handleSourceFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    sourceRef.current = img;
    setSourceFile(f);
    setSourcePreview({ name: f.name, size: f.size, url });
  };

  const handleRefFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    refImageRef.current = img;
    setRefFile(f);
    setRefPreview({ name: f.name, size: f.size, url });
  };

  const handleCubeUpload = async (f: File) => {
    const text = await f.text();
    const lut = parseCubeLut(text);
    setCustomLut(lut);
    setLutLabel(lut.title ?? f.name);
    setPresetId('');
  };

  const referenceStatsJob = useAsyncComputed(
    async () => {
      const img = refImageRef.current;
      if (!img) return null;
      return computeLabStatsFromImage(img);
    },
    [refFile],
    { delay: 100, enabled: Boolean(refFile) && mode === 'transfer' },
  );

  const targetStatsJob = useAsyncComputed(
    async () => {
      const img = sourceRef.current;
      if (!img) return null;
      return computeLabStatsFromImage(img);
    },
    [sourceFile],
    { delay: 100, enabled: Boolean(sourceFile) && mode === 'transfer' },
  );

  const gradeJobRef = React.useRef<{ dataUrl: string } | null>(null);

  const gradeJob = useAsyncComputed(
    async () => {
      const img = sourceRef.current;
      if (!img || !webglOk) return null;

      const options: GradeOptions = {
        mode,
        adjustments,
        strength,
        lut: mode === 'lut' ? activeLut : null,
        referenceStats: referenceStatsJob.value,
        targetStats: targetStatsJob.value,
        transferStrength,
      };

      if (mode === 'transfer' && (!options.referenceStats || !options.targetStats)) {
        return null;
      }

      const prev = gradeJobRef.current;
      if (prev) URL.revokeObjectURL(prev.dataUrl);

      const result = await gradeImage(img, options);
      gradeJobRef.current = result;
      return result;
    },
    [
      sourceFile,
      mode,
      adjustments,
      strength,
      transferStrength,
      activeLut,
      referenceStatsJob.value,
      targetStatsJob.value,
      webglOk,
      presetId,
      customLut,
    ],
    { delay: 150, enabled: Boolean(sourceFile) && webglOk },
  );
  React.useEffect(
    () => () => {
      if (gradeJobRef.current) URL.revokeObjectURL(gradeJobRef.current.dataUrl);
    },
    [],
  );

  // 有源图时生成预设缩略图
  React.useEffect(() => {
    if (!sourcePreview?.url) return;
    let cancelled = false;
    const img = sourceRef.current;
    if (!img) return;

    const run = async () => {
      const thumbs: Record<string, string> = {};
      for (const preset of BUILTIN_LUT_PRESETS) {
        if (cancelled) return;
        try {
          const lut = generatePresetLut(preset.id, 17);
          const result = await gradeImage(img, {
            mode: 'lut',
            adjustments: DEFAULT_ADJUSTMENTS,
            strength: 100,
            lut,
            referenceStats: null,
            targetStats: null,
            transferStrength: 100,
          });
          thumbs[preset.id] = result.dataUrl;
        } catch {
          // 缩略图失败时回退到渐变色
        }
      }
      if (!cancelled) setPresetThumbs(thumbs);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sourcePreview?.url]);

  const patchAdjustment = (key: keyof GradeAdjustments, value: number) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  };

  const resetAdjustments = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setStrength(100);
    setTransferStrength(100);
  };

  const exportBlob = gradeJob.value?.blob ?? null;
  const beforeUrl = sourcePreview?.url;
  const afterUrl = gradeJob.value?.dataUrl;

  return (
    <ToolView
      tool={tool}
      actions={
        <DownloadButton
          data={exportBlob}
          filename={`graded-${sourceFile?.name?.replace(/\.[^.]+$/, '') ?? 'image'}.png`}
          disabled={!exportBlob}
        />
      }
    >
      {!webglOk && (
        <Notice tone="danger" className="mb-4">
          当前浏览器不支持 WebGL2 3D 纹理，无法使用 LUT 调色。请使用 Chrome、Edge、Firefox 或 Safari
          16+。
        </Notice>
      )}

      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="源图片">
              <FileDropzone
                accept="image/*"
                onFile={handleSourceFile}
                current={sourcePreview}
                onRemove={() => {
                  setSourceFile(null);
                  setSourcePreview(null);
                  sourceRef.current = null;
                }}
              />
            </Panel>

            <Panel title="调色模式">
              <SegmentedControl
                value={mode}
                onValueChange={(v) => setMode(v as 'lut' | 'transfer')}
                options={[
                  { value: 'lut', label: 'LUT 调色' },
                  { value: 'transfer', label: '参考图仿色' },
                ]}
              />
            </Panel>

            {mode === 'lut' ? (
              <>
                <Panel title="LUT 预设" description="点击选用内置调色，或上传 .cube 文件">
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {BUILTIN_LUT_PRESETS.map((preset) => (
                      <PresetCard
                        key={preset.id}
                        name={preset.name}
                        preview={preset.preview}
                        thumbnail={presetThumbs[preset.id]}
                        active={!customLut && presetId === preset.id}
                        onClick={() => {
                          setPresetId(preset.id);
                          setCustomLut(null);
                          setLutLabel(preset.name);
                        }}
                      />
                    ))}
                  </div>
                  <FileDropzone
                    accept=".cube,text/plain"
                    hint="上传 .cube LUT 文件"
                    onFile={handleCubeUpload}
                    current={customLut ? { name: lutLabel, size: 0 } : null}
                    onRemove={() => {
                      setCustomLut(null);
                      setPresetId('cinematic');
                      setLutLabel('电影青橙');
                    }}
                  />
                </Panel>

                <Panel title="LUT 强度">
                  <SliderRow
                    label="强度"
                    value={strength}
                    onChange={setStrength}
                    min={0}
                    max={100}
                    step={1}
                    suffix="%"
                  />
                </Panel>
              </>
            ) : (
              <Panel title="参考图" description="上传一张色调参考图，将把其色彩风格迁移到源图">
                <FileDropzone
                  accept="image/*"
                  onFile={handleRefFile}
                  current={refPreview}
                  onRemove={() => {
                    setRefFile(null);
                    setRefPreview(null);
                    refImageRef.current = null;
                  }}
                />
                <SliderRow
                  label="仿色强度"
                  value={transferStrength}
                  onChange={setTransferStrength}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  className="mt-4"
                />
              </Panel>
            )}

            <Panel
              title="基础调整"
              description="曝光、对比度、色温、饱和度"
              actions={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentsOpen((o) => !o)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {adjustmentsOpen ? '收起' : '展开'}
                  </button>
                  {adjustmentsOpen && (
                    <button
                      type="button"
                      onClick={resetAdjustments}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      重置
                    </button>
                  )}
                </div>
              }
            >
              {adjustmentsOpen && (
              <>
              <SliderRow
                label="曝光"
                value={adjustments.exposure}
                onChange={(v) => patchAdjustment('exposure', v)}
                min={-2}
                max={2}
                step={0.05}
                suffix=" EV"
              />
              <SliderRow
                label="对比度"
                value={adjustments.contrast}
                onChange={(v) => patchAdjustment('contrast', v)}
                min={-100}
                max={100}
                step={1}
                className="mt-3"
              />
              <SliderRow
                label="色温"
                value={adjustments.temperature}
                onChange={(v) => patchAdjustment('temperature', v)}
                min={-100}
                max={100}
                step={1}
                className="mt-3"
              />
              <SliderRow
                label="饱和度"
                value={adjustments.saturation}
                onChange={(v) => patchAdjustment('saturation', v)}
                min={-100}
                max={100}
                step={1}
                className="mt-3"
              />
              </>
              )}
            </Panel>
          </div>
        }
        output={
          <Panel title="预览对比" bodyClassName="relative min-h-[360px]">
            <BusyOverlay show={gradeJob.pending} label="调色处理中…" />
            {!sourceFile ? (
              <EmptyState title="上传照片开始调色" description="支持 JPG / PNG / WebP" />
            ) : gradeJob.error ? (
              <Notice tone="danger">{gradeJob.error}</Notice>
            ) : beforeUrl && afterUrl ? (
              <CompareSlider beforeUrl={beforeUrl} afterUrl={afterUrl} afterLabel="调色后" />
            ) : mode === 'transfer' && !refFile ? (
              <EmptyState title="请上传参考图" description="仿色模式需要一张色调参考图片" />
            ) : (
              <EmptyState title="处理中" description="正在应用调色效果…" />
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
