'use client';

import * as React from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  GripVertical,
  Images,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import JSZip from 'jszip';
import { toast } from 'sonner';

import { StatGrid } from '@/components/tool/bits';
import { CompareSlider } from '@/components/tool/compare-slider';
import { EmptyState, Notice, Panel } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { Button } from '@/components/ui/button';
import { SegmentedControl, Select, SliderRow, SwitchRow } from '@/components/ui/controls';
import { downloadFile, isAcceptFile } from '@/lib/core/browser';
import type { OutputMime } from '@/lib/core/image';
import {
  BUILTIN_PIPELINE_PRESETS,
  createStepId,
  DEFAULT_PIPELINE_STEPS,
  deletePipelinePreset,
  listPipelinePresets,
  resolveOutputFilename,
  savePipelinePreset,
  STEP_TYPE_LABELS,
  type CropStep,
  type FilterStep,
  type FormatStep,
  type PipelinePreset,
  type PipelineStep,
  type PipelineStepType,
  type RenameStep,
  type ResizeStep,
  type WatermarkStep,
} from '@/lib/core/image-pipeline';
import { cn, formatBytes } from '@/lib/utils';

import { useImagePipelineWorker } from './use-image-pipeline-worker';

/* ------------------------------------------------------------------ *
 * 类型与常量
 * ------------------------------------------------------------------ */

interface UploadedFile {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
}

interface ProcessedResult {
  fileId: string;
  originalName: string;
  outputName: string;
  blob: Blob;
  width: number;
  height: number;
  size: number;
  done: boolean;
}

type WizardStep = 'upload' | 'pipeline' | 'run';

const WIZARD_LABELS: Record<WizardStep, string> = {
  upload: '上传图片',
  pipeline: '编排流水线',
  run: '执行下载',
};

const FORMAT_OPTIONS: { value: OutputMime; label: string }[] = [
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' },
];

const ASPECT_OPTIONS = [
  { value: '1', label: '1:1 正方形' },
  { value: '1.333', label: '4:3' },
  { value: '1.777', label: '16:9' },
  { value: '0.75', label: '3:4 竖版' },
  { value: '0.5625', label: '9:16 竖版' },
];

/* ------------------------------------------------------------------ *
 * 步骤工厂
 * ------------------------------------------------------------------ */

function createDefaultStep(type: PipelineStepType): PipelineStep {
  const id = createStepId();
  switch (type) {
    case 'resize':
      return { id, type, enabled: true, mode: 'long-edge', value: 1920 };
    case 'crop':
      return { id, type, enabled: true, mode: 'aspect', aspect: 1 };
    case 'filter':
      return { id, type, enabled: true, brightness: 100, contrast: 100, saturate: 100 };
    case 'watermark':
      return {
        id,
        type,
        enabled: true,
        text: '© iWhimsy',
        color: '#ffffff',
        fontSize: 28,
        opacity: 35,
        spacing: 1.8,
        rotation: -22.5,
        single: false,
        bold: true,
      };
    case 'format':
      return { id, type, enabled: true, mime: 'image/jpeg', quality: 0.85 };
    case 'rename':
      return { id, type, enabled: true, template: '{name}_{index}' };
    default:
      return { id, type: 'format', enabled: true, mime: 'image/jpeg', quality: 0.85 };
  }
}

/* ------------------------------------------------------------------ *
 * 子组件：步骤参数编辑
 * ------------------------------------------------------------------ */

function StepParamsEditor({
  step,
  onChange,
}: {
  step: PipelineStep;
  onChange: (next: PipelineStep) => void;
}) {
  if (step.type === 'resize') {
    const s = step as ResizeStep;
    return (
      <div className="flex flex-col gap-3">
        <SegmentedControl
          value={s.mode}
          onValueChange={(v) => onChange({ ...s, mode: v as ResizeStep['mode'] })}
          options={[
            { value: 'long-edge', label: '长边' },
            { value: 'percentage', label: '百分比' },
            { value: 'width', label: '宽度' },
            { value: 'height', label: '高度' },
            { value: 'exact', label: '指定' },
          ]}
        />
        {s.mode === 'exact' ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              宽度
              <input
                type="number"
                value={s.exactWidth ?? 1920}
                onChange={(e) =>
                  onChange({ ...s, exactWidth: Number(e.target.value), mode: 'exact' })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              高度
              <input
                type="number"
                value={s.exactHeight ?? 1080}
                onChange={(e) =>
                  onChange({ ...s, exactHeight: Number(e.target.value), mode: 'exact' })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
          </div>
        ) : (
          <SliderRow
            label={s.mode === 'percentage' ? '缩放比例 %' : '像素值'}
            value={s.value}
            onChange={(v) => onChange({ ...s, value: v })}
            min={s.mode === 'percentage' ? 10 : 100}
            max={s.mode === 'percentage' ? 200 : 4096}
            step={s.mode === 'percentage' ? 5 : 10}
          />
        )}
      </div>
    );
  }

  if (step.type === 'crop') {
    const s = step as CropStep;
    return (
      <div className="flex flex-col gap-3">
        <SegmentedControl
          value={s.mode}
          onValueChange={(v) => onChange({ ...s, mode: v as CropStep['mode'] })}
          options={[
            { value: 'aspect', label: '按比例' },
            { value: 'exact', label: '指定尺寸' },
          ]}
        />
        {s.mode === 'aspect' ? (
          <Select
            value={String(s.aspect ?? 1)}
            onValueChange={(v) => onChange({ ...s, aspect: Number(v) })}
            options={ASPECT_OPTIONS}
            ariaLabel="裁剪比例"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">
              宽度
              <input
                type="number"
                value={s.width ?? 800}
                onChange={(e) => onChange({ ...s, width: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              高度
              <input
                type="number"
                value={s.height ?? 600}
                onChange={(e) => onChange({ ...s, height: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              />
            </label>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">居中裁剪，保留画面中心区域</p>
      </div>
    );
  }

  if (step.type === 'filter') {
    const s = step as FilterStep;
    return (
      <div className="flex flex-col gap-2">
        <SliderRow
          label="亮度"
          value={s.brightness}
          onChange={(v) => onChange({ ...s, brightness: v })}
          min={50}
          max={150}
        />
        <SliderRow
          label="对比度"
          value={s.contrast}
          onChange={(v) => onChange({ ...s, contrast: v })}
          min={50}
          max={150}
        />
        <SliderRow
          label="饱和度"
          value={s.saturate}
          onChange={(v) => onChange({ ...s, saturate: v })}
          min={0}
          max={200}
        />
      </div>
    );
  }

  if (step.type === 'watermark') {
    const s = step as WatermarkStep;
    return (
      <div className="flex flex-col gap-3">
        <label className="text-xs text-muted-foreground">
          水印文字
          <input
            type="text"
            value={s.text}
            onChange={(e) => onChange({ ...s, text: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            颜色
            <input
              type="color"
              value={s.color}
              onChange={(e) => onChange({ ...s, color: e.target.value })}
              className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-border bg-background"
            />
          </label>
          <SliderRow
            label="字号"
            value={s.fontSize}
            onChange={(v) => onChange({ ...s, fontSize: v })}
            min={12}
            max={72}
          />
        </div>
        <SliderRow
          label="不透明度 %"
          value={s.opacity}
          onChange={(v) => onChange({ ...s, opacity: v })}
          min={5}
          max={100}
        />
        <SwitchRow
          label="单点居中（版权署名）"
          checked={s.single}
          onCheckedChange={(v) => onChange({ ...s, single: v })}
        />
      </div>
    );
  }

  if (step.type === 'format') {
    const s = step as FormatStep;
    return (
      <div className="flex flex-col gap-3">
        <Select
          value={s.mime}
          onValueChange={(v) => onChange({ ...s, mime: v as OutputMime })}
          options={FORMAT_OPTIONS}
          ariaLabel="输出格式"
        />
        {s.mime !== 'image/png' && (
          <SliderRow
            label="质量"
            value={Math.round(s.quality * 100)}
            onChange={(v) => onChange({ ...s, quality: v / 100 })}
            min={30}
            max={100}
          />
        )}
      </div>
    );
  }

  if (step.type === 'rename') {
    const s = step as RenameStep;
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs text-muted-foreground">
          命名模板
          <input
            type="text"
            value={s.template}
            onChange={(e) => onChange({ ...s, template: e.target.value })}
            placeholder="{name}_{index}"
            className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-sm"
          />
        </label>
        <p className="text-[11px] text-muted-foreground">
          可用变量：<code className="text-foreground">{'{name}'}</code> 原名、
          <code className="text-foreground">{'{index}'}</code> 序号、
          <code className="text-foreground">{'{width}'}</code> /{' '}
          <code className="text-foreground">{'{height}'}</code> 尺寸
        </p>
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ *
 * 主组件
 * ------------------------------------------------------------------ */

export default function ImagePipeline() {
  const tool = useToolMeta('image-pipeline');
  useTrackRecent(tool.slug);
  const { processImage, cancel } = useImagePipelineWorker();

  const [wizardStep, setWizardStep] = React.useState<WizardStep>('upload');
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [steps, setSteps] = React.useState<PipelineStep[]>(DEFAULT_PIPELINE_STEPS);
  const [expandedStep, setExpandedStep] = React.useState<string | null>(null);
  const [dragIdx, setDragIdx] = React.useState<number | null>(null);

  const [presets, setPresets] = React.useState<PipelinePreset[]>([]);
  const [presetName, setPresetName] = React.useState('');

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewMeta, setPreviewMeta] = React.useState<{
    width: number;
    height: number;
    size: number;
    name: string;
  } | null>(null);
  const [previewing, setPreviewing] = React.useState(false);

  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const [results, setResults] = React.useState<ProcessedResult[]>([]);
  const cancelRef = React.useRef(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    listPipelinePresets().then(setPresets).catch(() => {});
  }, []);

  React.useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.url));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [files, previewUrl]);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!isAcceptFile(file, 'image/*')) continue;
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      });
    }
    if (newFiles.length === 0) {
      toast.error('未找到支持的图片文件');
      return;
    }
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const updateStep = (id: string, next: PipelineStep) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? next : s)));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    setSteps(next);
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const addStep = (type: PipelineStepType) => {
    const step = createDefaultStep(type);
    setSteps((prev) => [...prev, step]);
    setExpandedStep(step.id);
  };

  const loadPreset = (preset: PipelinePreset) => {
    setSteps(preset.config.steps.map((s) => ({ ...s, id: createStepId() })));
    toast.success(`已载入预设「${preset.name}」`);
  };

  const handleSavePreset = async () => {
    const name = presetName.trim();
    if (!name) {
      toast.error('请输入预设名称');
      return;
    }
    const preset: PipelinePreset = {
      id: `user-${Date.now()}`,
      name,
      config: { steps },
      createdAt: Date.now(),
    };
    await savePipelinePreset(preset);
    setPresets((prev) => [preset, ...prev]);
    setPresetName('');
    toast.success('预设已保存');
  };

  const handleDeletePreset = async (id: string) => {
    if (id.startsWith('builtin-')) return;
    await deletePipelinePreset(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
    toast.success('预设已删除');
  };

  const runPreview = async () => {
    if (files.length === 0) return;
    setPreviewing(true);
    try {
      const result = await processImage(files[0].file, steps);
      const outputName = resolveOutputFilename(steps, {
        originalName: files[0].name,
        index: 1,
        width: result.width,
        height: result.height,
        mime: result.mime,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(result.blob);
      setPreviewUrl(url);
      setPreviewMeta({
        width: result.width,
        height: result.height,
        size: result.size,
        name: outputName,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '预览失败');
    } finally {
      setPreviewing(false);
    }
  };

  const runBatch = async () => {
    if (files.length === 0) return;
    setRunning(true);
    cancelRef.current = false;
    setProgress({ current: 0, total: files.length });
    const output: ProcessedResult[] = [];

    for (let i = 0; i < files.length; i += 1) {
      if (cancelRef.current) break;
      const item = files[i];
      try {
        const result = await processImage(item.file, steps);
        const outputName = resolveOutputFilename(steps, {
          originalName: item.name,
          index: i + 1,
          width: result.width,
          height: result.height,
          mime: result.mime,
        });
        output.push({
          fileId: item.id,
          originalName: item.name,
          outputName,
          blob: result.blob,
          width: result.width,
          height: result.height,
          size: result.size,
          done: true,
        });
        setResults([...output]);
        setProgress({ current: i + 1, total: files.length });
      } catch (err) {
        if (cancelRef.current) break;
        toast.error(`${item.name}: ${err instanceof Error ? err.message : '处理失败'}`);
      }
    }

    setRunning(false);
    if (!cancelRef.current && output.length > 0) {
      toast.success(`已完成 ${output.length} / ${files.length} 张`);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    cancel();
    setRunning(false);
    toast.info('已取消，已完成的图片保留在结果列表');
  };

  const downloadZip = async () => {
    const done = results.filter((r) => r.done);
    if (done.length === 0) {
      toast.error('还没有可下载的结果');
      return;
    }
    const zip = new JSZip();
    for (const r of done) {
      zip.file(r.outputName, r.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadFile(blob, `iwhimsy-pipeline-${Date.now()}.zip`);
    toast.success(`已打包 ${done.length} 个文件`);
  };

  const totalOutputSize = results.reduce((sum, r) => sum + r.size, 0);
  const allPresets = [...BUILTIN_PIPELINE_PRESETS, ...presets];

  return (
    <ToolView
      tool={tool}
      actions={
        results.length > 0 ? (
          <Button variant="primary" size="sm" onClick={downloadZip}>
            <Download />
            下载 ZIP ({results.length})
          </Button>
        ) : undefined
      }
    >
      {/* 步骤指示器 */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(WIZARD_LABELS) as WizardStep[]).map((key, i) => (
          <React.Fragment key={key}>
            <button
              type="button"
              onClick={() => setWizardStep(key)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                wizardStep === key
                  ? 'border-primary bg-primary-subtle text-primary'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'grid size-5 place-items-center rounded-full text-[10px] font-bold',
                  wizardStep === key ? 'bg-primary text-white' : 'bg-surface-2',
                )}
              >
                {i + 1}
              </span>
              {WIZARD_LABELS[key]}
            </button>
            {i < 2 && <div className="hidden h-px min-w-4 flex-1 bg-border sm:block" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: 上传 */}
      {wizardStep === 'upload' && (
        <div className="flex flex-col gap-4">
          <Panel title="上传图片" description="支持多选与拖拽，可单独移除">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-background px-6 py-9 transition-colors hover:border-primary/60 hover:bg-surface-2"
            >
              <div className="grid size-12 place-items-center rounded-full border border-border bg-surface-2">
                <UploadCloud className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                拖拽多张图片到此处，或<span className="text-primary"> 点击选择</span>
              </p>
              <p className="text-xs text-muted-foreground">
                文件仅在本地浏览器处理，不会上传到任何服务器
              </p>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="group relative overflow-hidden rounded-xl border border-border bg-background"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="truncate text-[10px] text-white">{f.name}</p>
                      <p className="text-[9px] text-white/70">{formatBytes(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="移除"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-4 flex justify-between">
                <p className="text-xs text-muted-foreground">共 {files.length} 张图片</p>
                <Button size="sm" onClick={() => setWizardStep('pipeline')}>
                  下一步：编排流水线
                </Button>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Step 2: 流水线 */}
      {wizardStep === 'pipeline' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <Panel
              title="处理步骤"
              description="从上到下依次执行，可拖拽排序"
              actions={
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(STEP_TYPE_LABELS) as PipelineStepType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addStep(type)}
                      className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Plus className="mr-0.5 inline size-3" />
                      {STEP_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              }
            >
              {steps.length === 0 ? (
                <EmptyState
                  icon={<Images />}
                  title="还没有处理步骤"
                  description="点击上方按钮添加缩放、裁剪、水印等步骤"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx === null || dragIdx === idx) return;
                        const next = [...steps];
                        const [moved] = next.splice(dragIdx, 1);
                        next.splice(idx, 0, moved);
                        setSteps(next);
                        setDragIdx(null);
                      }}
                      className={cn(
                        'rounded-xl border border-border bg-background transition-opacity',
                        !step.enabled && 'opacity-50',
                      )}
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="text-[13px] font-medium text-foreground">
                            {STEP_TYPE_LABELS[step.type]}
                          </span>
                          <ChevronDown
                            className={cn(
                              'size-3.5 text-muted-foreground transition-transform',
                              expandedStep === step.id && 'rotate-180',
                            )}
                          />
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => updateStep(step.id, { ...step, enabled: !step.enabled })}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2"
                            aria-label={step.enabled ? '禁用' : '启用'}
                          >
                            {step.enabled ? (
                              <Eye className="size-3.5" />
                            ) : (
                              <EyeOff className="size-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(idx, -1)}
                            disabled={idx === 0}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 disabled:opacity-30"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(idx, 1)}
                            disabled={idx === steps.length - 1}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 disabled:opacity-30"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(step.id)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-danger-subtle hover:text-danger"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      {expandedStep === step.id && (
                        <div className="border-t border-border px-3 py-3">
                          <StepParamsEditor
                            step={step}
                            onChange={(next) => updateStep(step.id, next)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={runPreview}
                  disabled={files.length === 0 || previewing}
                >
                  {previewing ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  先跑一张看看
                </Button>
                <Button size="sm" onClick={() => setWizardStep('run')} disabled={files.length === 0}>
                  下一步：执行下载
                </Button>
              </div>
            </Panel>

            {previewUrl && previewMeta && files[0] && (
              <Panel title="预览对比" description={previewMeta.name}>
                <CompareSlider
                  beforeUrl={files[0].url}
                  afterUrl={previewUrl}
                  beforeLabel="原图"
                  afterLabel="处理后"
                />
                <StatGrid
                  className="mt-4"
                  columns={3}
                  items={[
                    { label: '宽度', value: previewMeta.width },
                    { label: '高度', value: previewMeta.height },
                    { label: '体积', value: formatBytes(previewMeta.size) },
                  ]}
                />
              </Panel>
            )}
          </div>

          <Panel title="预设" description="内置与用户保存的流水线">
            <div className="flex flex-col gap-2">
              {allPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2"
                >
                  <button
                    type="button"
                    onClick={() => loadPreset(preset)}
                    className="min-w-0 flex-1 text-left text-[13px] font-medium text-foreground hover:text-primary"
                  >
                    {preset.name}
                    {preset.id.startsWith('builtin-') && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">内置</span>
                    )}
                  </button>
                  {!preset.id.startsWith('builtin-') && (
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="grid size-6 place-items-center rounded text-muted-foreground hover:text-danger"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="预设名称"
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleSavePreset}>
                <Save className="size-3.5" />
                保存
              </Button>
            </div>
          </Panel>
        </div>
      )}

      {/* Step 3: 执行 */}
      {wizardStep === 'run' && (
        <div className="flex flex-col gap-4">
          <Panel title="批量处理">
            {files.length === 0 ? (
              <Notice tone="warning">请先上传图片</Notice>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  {!running ? (
                    <Button onClick={runBatch}>
                      <Play />
                      开始处理 {files.length} 张
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={handleCancel}>
                      <X />
                      取消
                    </Button>
                  )}
                  {results.length > 0 && (
                    <Button variant="primary" onClick={downloadZip}>
                      <Download />
                      下载 ZIP ({results.length})
                    </Button>
                  )}
                </div>

                {running && (
                  <div className="mb-4">
                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>处理中…</span>
                      <span>
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{
                          width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {results.length > 0 && (
                  <StatGrid
                    columns={3}
                    items={[
                      { label: '已完成', value: results.length, tone: 'success' },
                      { label: '总输出', value: formatBytes(totalOutputSize) },
                      {
                        label: '压缩率',
                        value:
                          files.length > 0
                            ? `${Math.round((1 - totalOutputSize / files.reduce((s, f) => s + f.size, 0)) * 100)}%`
                            : '—',
                      },
                    ]}
                  />
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {files.map((f) => {
                    const result = results.find((r) => r.fileId === f.id);
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          'relative overflow-hidden rounded-xl border',
                          result?.done ? 'border-success/40' : 'border-border',
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.url} alt="" className="aspect-square w-full object-cover" />
                        {result?.done && (
                          <div className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-success text-white">
                            <Check className="size-3.5" />
                          </div>
                        )}
                        {running && !result && (
                          <div className="absolute inset-0 grid place-items-center bg-surface/60">
                            <Loader2 className="size-5 animate-spin text-primary" />
                          </div>
                        )}
                        <div className="px-2 py-1.5">
                          <p className="truncate text-[10px] text-foreground">
                            {result?.outputName ?? f.name}
                          </p>
                          {result && (
                            <p className="text-[9px] text-muted-foreground">
                              {formatBytes(result.size)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Panel>
        </div>
      )}
    </ToolView>
  );
}
