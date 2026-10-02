'use client';

import * as React from 'react';
import { FileText, ScanText, Table2 } from 'lucide-react';

import { CopyButton, DownloadButton, StatGrid } from '@/components/tool/bits';
import { EmptyState, Notice, Panel, ToolIO } from '@/components/tool/shell';
import { ToolView, useToolMeta, useTrackRecent } from '@/components/tool/tool-view';
import { FileDropzone } from '@/components/tool/file-dropzone';
import { Button } from '@/components/ui/button';
import { SegmentedControl, Select } from '@/components/ui/controls';
import {
  averageConfidence,
  LANG_PACK_INFO,
  linesToText,
  mergeWordsToLines,
  tableToCsv,
  type LangPackMode,
  type OcrWord,
  wordsToTable,
} from '@/lib/core/ocr';
import { renderPdfPages } from '@/lib/pdf-render';
import { cn, formatBytes } from '@/lib/utils';

import { useOcrWorker } from './use-ocr-worker';

interface SourcePage {
  bitmap: ImageBitmap;
  previewUrl: string;
  width: number;
  height: number;
  pageNumber: number;
}

interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

type OutputMode = 'text' | 'table';

const OCR_SCENES = [
  { id: 'receipt', name: '收据发票', lang: 'fast' as LangPackMode, output: 'text' as OutputMode },
  { id: 'doc', name: '文档扫描', lang: 'standard' as LangPackMode, output: 'text' as OutputMode },
  { id: 'poster', name: '海报标语', lang: 'fast' as LangPackMode, output: 'text' as OutputMode },
  { id: 'table', name: '表格数据', lang: 'standard' as LangPackMode, output: 'table' as OutputMode },
];

async function cloneBitmap(source: ImageBitmap): Promise<ImageBitmap> {
  const canvas = new OffscreenCanvas(source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法复制图像');
  ctx.drawImage(source, 0, 0);
  return createImageBitmap(canvas);
}

async function bitmapToPreviewUrl(bitmap: ImageBitmap): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法生成预览');
  ctx.drawImage(bitmap, 0, 0);
  return canvas.toDataURL('image/png');
}

async function fileToBitmap(file: File): Promise<SourcePage> {
  const bitmap = await createImageBitmap(file);
  const previewUrl = await bitmapToPreviewUrl(bitmap);
  return {
    bitmap,
    previewUrl,
    width: bitmap.width,
    height: bitmap.height,
    pageNumber: 1,
  };
}

function RegionCanvas({
  page,
  region,
  onRegionChange,
  disabled,
}: {
  page: SourcePage;
  region: Region | null;
  onRegionChange: (region: Region | null) => void;
  disabled?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = React.useState({ w: 0, h: 0 });
  const [dragging, setDragging] = React.useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const maxW = 520;
  const scale = displaySize.w > 0 ? page.width / displaySize.w : 1;

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const parentW = el.parentElement?.clientWidth ?? maxW;
      const cap = Math.min(maxW, parentW > 0 ? parentW : maxW);
      const ratio = Math.min(1, cap / page.width);
      const w = Math.round(page.width * ratio);
      const h = Math.round(page.height * ratio);
      setDisplaySize({ w, h });
    };
    sync();
    const ro = new ResizeObserver(sync);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [page.width, page.height]);

  const toImageCoords = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(page.width, (clientX - rect.left) * scale));
    const y = Math.max(0, Math.min(page.height, (clientY - rect.top) * scale));
    return { x, y };
  };

  const activeRegion = React.useMemo(() => {
    if (dragging) {
      const x0 = Math.min(dragging.startX, dragging.currentX);
      const y0 = Math.min(dragging.startY, dragging.currentY);
      const x1 = Math.max(dragging.startX, dragging.currentX);
      const y1 = Math.max(dragging.startY, dragging.currentY);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    return region;
  }, [dragging, region]);

  const displayRegion = activeRegion
    ? {
        left: activeRegion.x / scale,
        top: activeRegion.y / scale,
        width: activeRegion.w / scale,
        height: activeRegion.h / scale,
      }
    : null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { x, y } = toImageCoords(e.clientX, e.clientY, rect);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { x, y } = toImageCoords(e.clientX, e.clientY, rect);
    setDragging((d) => (d ? { ...d, currentX: x, currentY: y } : null));
  };

  const handlePointerUp = () => {
    if (!dragging) return;
    const x0 = Math.min(dragging.startX, dragging.currentX);
    const y0 = Math.min(dragging.startY, dragging.currentY);
    const w = Math.abs(dragging.currentX - dragging.startX);
    const h = Math.abs(dragging.currentY - dragging.startY);
    setDragging(null);
    if (w < 8 || h < 8) {
      onRegionChange(null);
      return;
    }
    onRegionChange({ x: x0, y: y0, w, h });
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        ref={containerRef}
        className="relative mx-auto max-w-full overflow-hidden rounded-xl border border-border bg-surface-2"
        style={{ width: displaySize.w, height: displaySize.h }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.previewUrl}
          alt={`第 ${page.pageNumber} 页`}
          className="block size-full object-contain"
          draggable={false}
        />
        <div
          className={cn(
            'absolute inset-0 touch-none',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {displayRegion && displayRegion.width > 2 && displayRegion.height > 2 && (
            <div
              className="absolute border-2 border-primary bg-primary/10"
              style={{
                left: displayRegion.left,
                top: displayRegion.top,
                width: displayRegion.width,
                height: displayRegion.height,
              }}
            />
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>在预览图上拖拽框选识别区域；不框选则识别整页</span>
        {region && (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => onRegionChange(null)}
            disabled={disabled}
          >
            清除选区
          </button>
        )}
      </div>
    </div>
  );
}

export default function OcrStudio() {
  const tool = useToolMeta('ocr-studio');
  useTrackRecent(tool.slug);
  const ocr = useOcrWorker();

  const [file, setFile] = React.useState<File | null>(null);
  const [pages, setPages] = React.useState<SourcePage[]>([]);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [region, setRegion] = React.useState<Region | null>(null);
  const [langMode, setLangMode] = React.useState<LangPackMode>('fast');
  const [activeSceneId, setActiveSceneId] = React.useState('receipt');
  const [outputMode, setOutputMode] = React.useState<OutputMode>('text');
  const [resultText, setResultText] = React.useState('');
  const [resultTable, setResultTable] = React.useState<string[][]>([]);
  const [allWords, setAllWords] = React.useState<OcrWord[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [pageProgress, setPageProgress] = React.useState<string | null>(null);
  const cancelRef = React.useRef(false);
  const runIdRef = React.useRef(0);
  const pagesRef = React.useRef(pages);
  React.useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const cleanupPages = React.useCallback((list: SourcePage[]) => {
    for (const p of list) {
      p.bitmap.close();
    }
  }, []);

  React.useEffect(() => () => cleanupPages(pagesRef.current), [cleanupPages]);

  const handleFile = async (f: File) => {
    setLoadError(null);
    setResultText('');
    setResultTable([]);
    setAllWords([]);
    setRegion(null);
    setCurrentPage(0);
    cleanupPages(pages);
    setPages([]);
    setFile(f);

    try {
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        setBusy(true);
        setPageProgress('正在渲染 PDF…');
        const rendered = await renderPdfPages(f, 2, (page, total) => {
          setPageProgress(`渲染 PDF：第 ${page} / ${total} 页`);
        });
        const sourcePages: SourcePage[] = [];
        for (const p of rendered) {
          const previewUrl = await bitmapToPreviewUrl(p.bitmap);
          sourcePages.push({
            bitmap: p.bitmap,
            previewUrl,
            width: p.width,
            height: p.height,
            pageNumber: p.pageNumber,
          });
        }
        setPages(sourcePages);
        setPageProgress(null);
        setBusy(false);
      } else {
        const page = await fileToBitmap(f);
        setPages([page]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '文件加载失败');
      setBusy(false);
      setPageProgress(null);
    }
  };

  const { init: initOcr, recognize: recognizePage, terminate: terminateOcr } = ocr;

  const runOcr = React.useCallback(async () => {
    if (pages.length === 0) return;
    const runId = ++runIdRef.current;
    cancelRef.current = false;
    setBusy(true);
    setLoadError(null);
    setResultText('');
    setResultTable([]);
    setAllWords([]);

    try {
      await initOcr(langMode);

      const textParts: string[] = [];
      const tableParts: string[][] = [];
      const collectedWords: OcrWord[] = [];

      for (let i = 0; i < pages.length; i++) {
        if (cancelRef.current || runId !== runIdRef.current) break;

        const page = pages[i];
        setPageProgress(
          pages.length > 1 ? `识别中：第 ${i + 1} / ${pages.length} 页` : '识别中…',
        );

        const bitmap = await cloneBitmap(page.bitmap);
        const useRegion = region && (pages.length === 1 || i === currentPage);
        const rectangle = useRegion
          ? {
              left: Math.round(region.x),
              top: Math.round(region.y),
              width: Math.round(region.w),
              height: Math.round(region.h),
            }
          : undefined;

        const result = await recognizePage(bitmap, rectangle);
        collectedWords.push(...result.words);

        const lines = mergeWordsToLines(result.words);
        const pageText = linesToText(lines);
        const pageTable = wordsToTable(result.words);

        if (pages.length > 1) {
          textParts.push(`--- 第 ${page.pageNumber} 页 ---\n${pageText}`);
          if (pageTable.length > 0) {
            tableParts.push([`第 ${page.pageNumber} 页`]);
            tableParts.push(...pageTable);
            tableParts.push([]);
          }
        } else {
          textParts.push(pageText);
          tableParts.push(...pageTable);
        }
      }

      setAllWords(collectedWords);
      const mergedTable =
        pages.length > 1
          ? tableParts.filter((row) => row.length > 0)
          : wordsToTable(collectedWords);

      if (outputMode === 'table') {
        setResultTable(mergedTable);
        setResultText(mergedTable.map((row) => row.join('\t')).join('\n'));
      } else {
        setResultText(textParts.join('\n\n'));
        setResultTable(mergedTable);
      }
    } catch (err) {
      if (!cancelRef.current && runId === runIdRef.current) {
        setLoadError(err instanceof Error ? err.message : '识别失败');
      }
    } finally {
      if (runId === runIdRef.current) {
        setBusy(false);
        setPageProgress(null);
      }
    }
  }, [pages, region, langMode, outputMode, currentPage, initOcr, recognizePage]);

  React.useEffect(() => {
    if (pages.length === 0) return;
    const timer = setTimeout(() => {
      void runOcr();
    }, 400);
    return () => clearTimeout(timer);
  }, [pages, region, langMode, outputMode, runOcr]);

  const handleCancel = () => {
    cancelRef.current = true;
    void terminateOcr();
    setBusy(false);
    setPageProgress(null);
  };

  const handleRemove = () => {
    cancelRef.current = true;
    cleanupPages(pages);
    setFile(null);
    setPages([]);
    setResultText('');
    setResultTable([]);
    setAllWords([]);
    setRegion(null);
    setLoadError(null);
  };

  const exportTxt = resultText;
  const exportCsv = tableToCsv(resultTable.length > 0 ? resultTable : wordsToTable(allWords));
  const progressPct = ocr.progress ? Math.round(ocr.progress.progress * 100) : null;

  const activePage = pages[currentPage] ?? null;

  return (
    <ToolView
      tool={tool}
      actions={
        <>
          <CopyButton value={resultText} disabled={!resultText} />
          <DownloadButton
            data={exportTxt}
            filename={(file?.name.replace(/\.[^.]+$/, '') ?? 'ocr') + '.txt'}
            mimeType="text/plain;charset=utf-8"
            disabled={!exportTxt}
          >
            导出 TXT
          </DownloadButton>
          <DownloadButton
            data={exportCsv}
            filename={(file?.name.replace(/\.[^.]+$/, '') ?? 'ocr') + '.csv'}
            mimeType="text/csv;charset=utf-8"
            disabled={!exportCsv}
            variant="secondary"
          >
            导出 CSV
          </DownloadButton>
        </>
      }
    >
      <Notice tone="info">
        全部在浏览器本地完成，图片与 PDF 不会上传。适用于印刷体文字；手写体识别效果有限。
      </Notice>

      <ToolIO
        split="wide-input"
        input={
          <div className="flex flex-col gap-4">
            <Panel title="输入文件">
              <FileDropzone
                accept="image/*,application/pdf,.pdf"
                hint="支持图片与 PDF 扫描件，文件仅在本地处理"
                onFile={handleFile}
                current={
                  file
                    ? {
                        name: file.name,
                        size: file.size,
                        url: activePage?.previewUrl,
                      }
                    : null
                }
                onRemove={handleRemove}
                disabled={busy}
              />
              {file && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {OCR_SCENES.map((scene) => (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => {
                          setActiveSceneId(scene.id);
                          setLangMode(scene.lang);
                          setOutputMode(scene.output);
                        }}
                        disabled={busy}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50',
                          activeSceneId === scene.id
                            ? 'border-primary bg-primary-subtle/40 text-foreground'
                            : 'border-border hover:border-primary/40 hover:bg-primary-subtle/30',
                        )}
                      >
                        {scene.name}
                      </button>
                    ))}
                  </div>
                  <Select
                    value={langMode}
                    onValueChange={(v) => setLangMode(v as LangPackMode)}
                    options={[
                      {
                        value: 'fast',
                        label: `${LANG_PACK_INFO.fast.label} · ${LANG_PACK_INFO.fast.size}`,
                      },
                      {
                        value: 'standard',
                        label: `${LANG_PACK_INFO.standard.label} · ${LANG_PACK_INFO.standard.size}`,
                      },
                    ]}
                    ariaLabel="语言包精度"
                    disabled={busy}
                  />
                  <SegmentedControl
                    value={outputMode}
                    onValueChange={(v) => setOutputMode(v as OutputMode)}
                    options={[
                      { value: 'text', label: '文本', icon: <FileText className="size-3.5" /> },
                      { value: 'table', label: '表格', icon: <Table2 className="size-3.5" /> },
                    ]}
                  />
                  {pages.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {pages.map((p, idx) => (
                        <button
                          key={p.pageNumber}
                          type="button"
                          onClick={() => {
                            setCurrentPage(idx);
                            setRegion(null);
                          }}
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                            idx === currentPage
                              ? 'border-primary bg-primary-subtle text-primary'
                              : 'border-border text-muted-foreground hover:border-border-strong',
                          )}
                        >
                          第 {p.pageNumber} 页
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {activePage && (
              <Panel title="预览与选区" description="拖拽框选只识别该区域">
                <RegionCanvas
                  page={activePage}
                  region={region}
                  onRegionChange={setRegion}
                  disabled={busy}
                />
              </Panel>
            )}
          </div>
        }
        output={
          <Panel
            title="识别结果"
            actions={
              busy ? (
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  取消
                </Button>
              ) : null
            }
          >
            {loadError && (
              <Notice tone="danger" className="mb-4">
                {loadError}
              </Notice>
            )}

            {(busy || ocr.initializing) && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {pageProgress ?? ocr.progress?.label ?? '准备中…'}
                  </span>
                  {progressPct !== null && (
                    <span className="font-mono text-xs text-muted-foreground">{progressPct}%</span>
                  )}
                </div>
                {progressPct !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-200"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {!file && (
              <EmptyState
                icon={<ScanText />}
                title="上传图片或 PDF"
                description="支持中文与英文印刷体识别，可框选区域、导出 TXT / CSV"
              />
            )}

            {file && outputMode === 'text' && (
              <textarea
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder={busy ? '识别中…' : '识别结果将显示在这里，可直接编辑'}
                className="min-h-[320px] w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-sm leading-relaxed text-foreground outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"
                readOnly={busy}
              />
            )}

            {file && outputMode === 'table' && (
              <div className="overflow-x-auto rounded-xl border border-border">
                {resultTable.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    {busy ? '识别中…' : '暂无表格数据'}
                  </p>
                ) : (
                  <table className="w-full min-w-max border-collapse text-sm">
                    <tbody>
                      {resultTable.map((row, ri) => (
                        <tr key={ri} className="border-b border-border last:border-0">
                          {row.map((cell, ci) => (
                            <td
                              key={ci}
                              className="border-r border-border px-3 py-2 align-top last:border-r-0"
                              contentEditable={!busy}
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const next = resultTable.map((r) => [...r]);
                                next[ri][ci] = e.currentTarget.textContent ?? '';
                                setResultTable(next);
                                setResultText(next.map((r) => r.join('\t')).join('\n'));
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {resultText && !busy && (
              <StatGrid
                className="mt-4"
                columns={3}
                items={[
                  { label: '字符数', value: String(resultText.length) },
                  { label: '词块数', value: String(allWords.length) },
                  { label: '平均置信度', value: `${averageConfidence(allWords)}%` },
                  ...(file ? [{ label: '文件大小', value: formatBytes(file.size) }] : []),
                ]}
              />
            )}
          </Panel>
        }
      />
    </ToolView>
  );
}
