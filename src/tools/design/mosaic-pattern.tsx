'use client';

import * as React from 'react';

import { BusyOverlay, CopyButton, StatGrid } from '@/components/tool/bits';
import { CompareSlider } from '@/components/tool/compare-slider';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { SegmentedControl, SliderRow, SwitchRow } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/core/browser';
import { canvasToBlob, loadImageFromSrc } from '@/lib/core/image';
import {
  computeGridHeight,
  exportMaterialsCsv,
  exportMaterialsJson,
  exportMaterialsText,
  generateMosaicPattern,
  getPalette,
  MOSAIC_PRESETS,
  renderMosaicPattern,
  renderSourcePreview,
  type MosaicPatternType,
} from '@/lib/core/mosaic';
import { useAsyncComputed } from '@/lib/hooks';

type PreviewMode = 'source' | 'pattern' | 'finished';

export default function MosaicPattern() {
  const tool = useToolMeta('mosaic-pattern');
  useTrackRecent(tool.slug);

  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const patternCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const sourceCanvasRef = React.useRef<HTMLCanvasElement>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{ name: string; size: number; url: string } | null>(
    null,
  );
  const [patternType, setPatternType] = React.useState<MosaicPatternType>('lego');
  const [gridWidth, setGridWidth] = React.useState(48);
  const [gridHeight, setGridHeight] = React.useState(48);
  const [lockAspect, setLockAspect] = React.useState(true);
  const [dither, setDither] = React.useState(true);
  const [wastagePercent, setWastagePercent] = React.useState(10);
  const [showLabels, setShowLabels] = React.useState(true);
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>('pattern');
  const [cellSize, setCellSize] = React.useState(12);
  const [patternBlob, setPatternBlob] = React.useState<Blob | null>(null);
  const [activePresetId, setActivePresetId] = React.useState<string | null>(null);

  const handleFile = async (f: File) => {
    const url = URL.createObjectURL(f);
    const img = await loadImageFromSrc(url);
    imgRef.current = img;
    setFile(f);
    setPreview({ name: f.name, size: f.size, url });
    const h = computeGridHeight(img, gridWidth, true);
    setGridHeight(h);
  };

  const patternJob = useAsyncComputed(
    async () => {
      const img = imgRef.current;
      if (!img) return null;
      return generateMosaicPattern(img, {
        type: patternType,
        gridWidth,
        gridHeight,
        dither,
        wastagePercent,
      });
    },
    [file, patternType, gridWidth, gridHeight, dither, wastagePercent],
    { delay: 200, enabled: Boolean(file) },
  );

  const pattern = patternJob.value;
  const maxMaterial = pattern?.materials[0]?.count ?? 1;

  const finishedUrl = React.useMemo(
    () => (patternBlob ? URL.createObjectURL(patternBlob) : null),
    [patternBlob],
  );

  React.useEffect(
    () => () => {
      if (finishedUrl) URL.revokeObjectURL(finishedUrl);
    },
    [finishedUrl],
  );

  React.useEffect(() => {
    const img = imgRef.current;
    const sourceCanvas = sourceCanvasRef.current;
    if (!img || !sourceCanvas) return;
    const previewCanvas = renderSourcePreview(img, 420);
    sourceCanvas.width = previewCanvas.width;
    sourceCanvas.height = previewCanvas.height;
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(previewCanvas, 0, 0);
  }, [preview]);

  React.useEffect(() => {
    const canvas = patternCanvasRef.current;
    if (!canvas || !pattern) return;
    const rendered = renderMosaicPattern(pattern, {
      cellSize,
      showLabels: previewMode === 'pattern' && showLabels,
      previewMode: previewMode === 'finished',
    });
    canvas.width = rendered.width;
    canvas.height = rendered.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(rendered, 0, 0);
    void canvasToBlob(canvas, 'image/png').then(setPatternBlob);
  }, [pattern, cellSize, showLabels, previewMode]);

  const applyPreset = (presetId: string) => {
    const preset = MOSAIC_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(presetId);
    setPatternType(preset.type);
    setGridWidth(preset.width);
    if (lockAspect && imgRef.current) {
      setGridHeight(computeGridHeight(imgRef.current, preset.width, true));
    } else {
      setGridHeight(preset.height);
    }
  };

  const handleGridWidth = (w: number) => {
    setGridWidth(w);
    if (lockAspect && imgRef.current) {
      setGridHeight(computeGridHeight(imgRef.current, w, true));
    }
  };

  const handleExportPng = () => {
    if (!patternBlob) return;
    downloadFile(patternBlob, `mosaic-${patternType}-${gridWidth}x${gridHeight}.png`, 'image/png');
  };

  const handleExportJson = () => {
    if (!pattern) return;
    const json = exportMaterialsJson(pattern, wastagePercent);
    downloadFile(json, `mosaic-materials-${gridWidth}x${gridHeight}.json`, 'application/json');
  };

  const presetsForType = MOSAIC_PRESETS.filter((p) => p.type === patternType);

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <Button variant="primary" size="sm" disabled={!patternBlob} onClick={handleExportPng}>
            导出图纸 PNG
          </Button>
          <Button variant="secondary" size="sm" disabled={!pattern} onClick={handleExportJson}>
            导出清单 JSON
          </Button>
        </>
      }
    >
      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="上传照片">
              <FileDropzone
                accept="image/*"
                onFile={handleFile}
                current={preview}
                onRemove={() => {
                  setFile(null);
                  setPreview(null);
                  imgRef.current = null;
                  setPatternBlob(null);
                }}
              />
            </Panel>

            {file && (
              <>
                <Panel title="图纸类型与尺寸">
                  <SegmentedControl
                    value={patternType}
                    onValueChange={(v) => {
                      setPatternType(v as MosaicPatternType);
                      setActivePresetId(null);
                    }}
                    options={[
                      { value: 'lego', label: '乐高' },
                      { value: 'cross-stitch', label: '十字绣' },
                    ]}
                    className="mb-3"
                  />
                  <p className="mb-2 text-xs text-muted-foreground">
                    色库：{getPalette(patternType).length} 色（LAB 空间匹配）
                  </p>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {presetsForType.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          activePresetId === p.id
                            ? 'border-primary bg-primary-subtle text-primary'
                            : 'border-border hover:border-border-strong hover:bg-surface-2'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <SliderRow
                    label="网格宽度"
                    value={gridWidth}
                    onChange={handleGridWidth}
                    min={16}
                    max={150}
                    step={1}
                  />
                  <SliderRow
                    label={lockAspect ? '网格高度（随比例）' : '网格高度'}
                    value={gridHeight}
                    onChange={(h) => {
                      if (!lockAspect) setGridHeight(h);
                    }}
                    min={16}
                    max={200}
                    step={1}
                    className="mt-3"
                  />
                  <SwitchRow
                    label="锁定原图比例"
                    checked={lockAspect}
                    onCheckedChange={(checked) => {
                      setLockAspect(checked);
                      if (checked && imgRef.current) {
                        setGridHeight(computeGridHeight(imgRef.current, gridWidth, true));
                      }
                    }}
                    className="mt-3"
                  />
                </Panel>

                <Panel title="量化选项">
                  <SwitchRow label="Floyd-Steinberg 抖动" checked={dither} onCheckedChange={setDither} />
                  <SliderRow
                    label="损耗预留"
                    value={wastagePercent}
                    onChange={setWastagePercent}
                    min={0}
                    max={30}
                    step={5}
                    suffix="%"
                    className="mt-3"
                  />
                  <SwitchRow
                    label="格子上显示色号"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                    className="mt-3"
                  />
                  <SliderRow
                    label="预览格大小"
                    value={cellSize}
                    onChange={setCellSize}
                    min={6}
                    max={24}
                    step={1}
                    className="mt-3"
                  />
                </Panel>
              </>
            )}
          </div>
        }
        output={
          <div className="flex flex-col gap-4">
            <Panel title="图纸预览" bodyClassName="relative min-h-[320px]">
              <BusyOverlay show={patternJob.pending} label="生成图纸…" />
              {!file ? (
                <EmptyState
                  title="上传照片开始生成"
                  description="支持 JPG / PNG / WebP，将量化到乐高或 DMC 色库"
                />
              ) : patternJob.error ? (
                <Notice tone="danger">{patternJob.error}</Notice>
              ) : (
                <div className="flex flex-col gap-4">
                  <SegmentedControl
                    value={previewMode}
                    onValueChange={(v) => setPreviewMode(v as PreviewMode)}
                    options={[
                      { value: 'source', label: '原图' },
                      { value: 'pattern', label: '图纸' },
                      { value: 'finished', label: '成品预览' },
                    ]}
                    full
                  />

                  {preview && finishedUrl && previewMode === 'finished' && (
                    <CompareSlider
                      beforeUrl={preview.url}
                      afterUrl={finishedUrl}
                      beforeLabel="原图"
                      afterLabel="成品"
                    />
                  )}

                  {preview && finishedUrl && previewMode === 'pattern' && (
                    <CompareSlider
                      beforeUrl={preview.url}
                      afterUrl={finishedUrl}
                      beforeLabel="原图"
                      afterLabel="图纸"
                    />
                  )}

                  <div className="overflow-auto rounded-xl border border-border bg-surface-2 p-2">
                    {previewMode === 'source' ? (
                      <canvas ref={sourceCanvasRef} className="mx-auto max-w-full" />
                    ) : (
                      <canvas ref={patternCanvasRef} className="mx-auto max-w-full" />
                    )}
                  </div>

                  {pattern && (
                    <StatGrid
                      columns={4}
                      items={[
                        { label: '网格', value: `${pattern.width}×${pattern.height}` },
                        { label: '总格数', value: pattern.totalCells },
                        {
                          label: '用色数',
                          value: pattern.uniqueColors,
                          tone: 'primary',
                        },
                        {
                          label: '色库',
                          value: pattern.type === 'lego' ? '乐高' : 'DMC',
                        },
                      ]}
                    />
                  )}
                </div>
              )}
            </Panel>

            {pattern && (
              <Panel
                title="用料清单"
                description={`按用量降序，已含 +${wastagePercent}% 采购建议`}
                actions={
                  <div className="flex gap-2">
                    <CopyButton
                      value={() => exportMaterialsText(pattern)}
                      size="sm"
                      variant="ghost"
                      sourceLabel="用料清单"
                    >
                      复制
                    </CopyButton>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        downloadFile(
                          exportMaterialsCsv(pattern),
                          `mosaic-materials-${gridWidth}x${gridHeight}.csv`,
                          'text/csv',
                        )
                      }
                    >
                      CSV
                    </Button>
                  </div>
                }
              >
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {pattern.materials.map((m) => (
                    <div key={`${m.id}-${m.colorIndex}`} className="flex items-center gap-3">
                      <span
                        className="size-8 shrink-0 rounded-md border border-border"
                        style={{ background: m.hex }}
                        title={m.hex}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {pattern.type === 'cross-stitch' ? (
                              <span className="mr-1.5 font-mono text-primary">{m.symbol}</span>
                            ) : null}
                            {m.id} · {m.name}
                          </p>
                          <p className="shrink-0 font-mono text-xs text-muted-foreground">
                            {m.count}
                            <span className="text-subtle-foreground"> → </span>
                            <span className="text-foreground">{m.countWithWastage}</span>
                          </p>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(m.count / maxMaterial) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        }
      />
    </ToolView>
  );
}
