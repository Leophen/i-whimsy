/**
 * OCR 结果处理 —— 纯函数，可在 Node / Worker 中复用。
 * 按 bbox 合并行、聚类表格、导出 CSV。
 */

import type { OcrPreprocessConfig } from './ocr-preprocess';

export interface OcrBBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: OcrBBox;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  bbox: OcrBBox;
}

function bboxCenterY(bbox: OcrBBox): number {
  return (bbox.y0 + bbox.y1) / 2;
}

function bboxHeight(bbox: OcrBBox): number {
  return bbox.y1 - bbox.y0;
}

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

/** 中文等 CJK 文本不应在词间插入空格。 */
export function joinOcrTokens(tokens: string[]): string {
  if (tokens.length === 0) return '';
  const combined = tokens.join('');
  const cjkCount = (combined.match(CJK_RE) ?? []).length;
  if (cjkCount / Math.max(1, combined.replace(/\s/g, '').length) >= 0.25) {
    return tokens.join('');
  }
  return tokens.join(' ');
}

function mergeBboxes(words: OcrWord[]): OcrBBox {
  return {
    x0: Math.min(...words.map((w) => w.bbox.x0)),
    y0: Math.min(...words.map((w) => w.bbox.y0)),
    x1: Math.max(...words.map((w) => w.bbox.x1)),
    y1: Math.max(...words.map((w) => w.bbox.y1)),
  };
}

/** 按 bbox 纵向位置把词合并成行。 */
export function mergeWordsToLines(words: OcrWord[]): OcrLine[] {
  if (words.length === 0) return [];

  const sorted = [...words].sort((a, b) => {
    const dy = bboxCenterY(a.bbox) - bboxCenterY(b.bbox);
    if (Math.abs(dy) > 1) return dy;
    return a.bbox.x0 - b.bbox.x0;
  });

  const heights = sorted.map((w) => bboxHeight(w.bbox)).filter((h) => h > 0);
  const medianHeight =
    heights.length > 0
      ? heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)]
      : 12;
  const rowThreshold = Math.max(4, medianHeight * 0.55);

  const lines: OcrLine[] = [];
  let current: OcrWord[] = [];
  let currentY = bboxCenterY(sorted[0].bbox);

  for (const word of sorted) {
    const cy = bboxCenterY(word.bbox);
    if (current.length > 0 && Math.abs(cy - currentY) > rowThreshold) {
      const rowWords = current.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      lines.push({
        text: joinOcrTokens(rowWords.map((w) => w.text)),
        words: rowWords,
        bbox: mergeBboxes(rowWords),
      });
      current = [];
    }
    current.push(word);
    currentY = current.length === 1 ? cy : (currentY + cy) / 2;
  }

  if (current.length > 0) {
    const rowWords = current.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    lines.push({
      text: joinOcrTokens(rowWords.map((w) => w.text)),
      words: rowWords,
      bbox: mergeBboxes(rowWords),
    });
  }

  return lines;
}

/** 把词聚类成表格行列（基于 bbox x/y 位置）。 */
export function wordsToTable(words: OcrWord[]): string[][] {
  const lines = mergeWordsToLines(words);
  if (lines.length === 0) return [];

  const lineHeights = lines.map((l) => bboxHeight(l.bbox)).filter((h) => h > 0);
  const medianLineHeight =
    lineHeights.length > 0
      ? lineHeights.slice().sort((a, b) => a - b)[Math.floor(lineHeights.length / 2)]
      : 14;

  const allX = words.map((w) => w.bbox.x0).sort((a, b) => a - b);
  const colThreshold = Math.max(8, medianLineHeight * 0.8);

  const anchors: number[] = [];
  for (const x of allX) {
    const idx = anchors.findIndex((c) => Math.abs(c - x) <= colThreshold);
    if (idx === -1) anchors.push(x);
    else anchors[idx] = (anchors[idx] + x) / 2;
  }
  anchors.sort((a, b) => a - b);

  const colCount = Math.max(1, anchors.length);

  return lines.map((line) => {
    const cells = new Array<string>(colCount).fill('');
    for (const word of line.words) {
      let col = 0;
      let bestDist = Infinity;
      for (let i = 0; i < anchors.length; i++) {
        const dist = Math.abs(word.bbox.x0 - anchors[i]);
        if (dist < bestDist) {
          bestDist = dist;
          col = i;
        }
      }
      cells[col] = cells[col] ? `${cells[col]} ${word.text}` : word.text;
    }
    return cells;
  });
}

export function linesToText(lines: OcrLine[] | string[]): string {
  if (lines.length === 0) return '';
  if (typeof lines[0] === 'string') return (lines as string[]).join('\n');
  return (lines as OcrLine[]).map((l) => l.text).join('\n');
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** 表格行导出为 CSV 字符串。 */
export function tableToCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\n');
}

export function averageConfidence(words: OcrWord[]): number {
  if (words.length === 0) return 0;
  const sum = words.reduce((acc, w) => acc + w.confidence, 0);
  return Math.round(sum / words.length);
}

export type LangPackMode = 'fast' | 'standard';
export type OcrSceneId = 'receipt' | 'doc' | 'poster' | 'table';
export type OcrOutputMode = 'text' | 'table';

/** Tesseract PSM 值（与 tesseract.js PSM 枚举一致）。 */
export type OcrPsm =
  | '3' // AUTO
  | '6' // SINGLE_BLOCK
  | '11'; // SPARSE_TEXT

export interface OcrSceneConfig {
  id: OcrSceneId;
  name: string;
  langMode: LangPackMode;
  languages: string;
  output: OcrOutputMode;
  psm: OcrPsm;
  rotateAuto: boolean;
  preprocess: OcrPreprocessConfig;
}

export const LANG_PACK_INFO: Record<
  LangPackMode,
  { label: string; size: string; path: string; hint: string }
> = {
  fast: {
    label: '快速',
    size: '约 1.6 MB',
    path: 'https://tessdata.projectnaptha.com/4.0.0_fast',
    hint: '适合清晰收据、大字号打印体',
  },
  standard: {
    label: '高精度（推荐）',
    size: '约 19 MB',
    path: 'https://tessdata.projectnaptha.com/4.0.0',
    hint: '适合海报、扫描件、复杂排版与彩色底图',
  },
};

export const OCR_SCENES: OcrSceneConfig[] = [
  {
    id: 'receipt',
    name: '收据发票',
    langMode: 'fast',
    languages: 'chi_sim+eng',
    output: 'text',
    psm: '3',
    rotateAuto: false,
    preprocess: { minShortSide: 1000, contrast: true, binarize: false },
  },
  {
    id: 'doc',
    name: '文档扫描',
    langMode: 'standard',
    languages: 'chi_sim+eng',
    output: 'text',
    psm: '3',
    rotateAuto: true,
    preprocess: { minShortSide: 1400, contrast: true, binarize: false },
  },
  {
    id: 'poster',
    name: '海报标语',
    langMode: 'standard',
    languages: 'chi_sim',
    output: 'text',
    psm: '11',
    rotateAuto: true,
    preprocess: { minShortSide: 1600, contrast: true, binarize: true },
  },
  {
    id: 'table',
    name: '表格数据',
    langMode: 'standard',
    languages: 'chi_sim+eng',
    output: 'table',
    psm: '6',
    rotateAuto: false,
    preprocess: { minShortSide: 1200, contrast: true, binarize: false },
  },
];

export const LOW_CONFIDENCE_THRESHOLD = 55;

export function getOcrScene(id: OcrSceneId): OcrSceneConfig {
  return OCR_SCENES.find((s) => s.id === id) ?? OCR_SCENES[0]!;
}

export function formatOcrStatus(status: string): string {
  const map: Record<string, string> = {
    'loading tesseract core': '加载 OCR 核心',
    'initializing tesseract': '初始化引擎',
    'loading language traineddata': '下载语言包',
    'initialized tesseract': '引擎就绪',
    'recognizing text': '识别文字',
    'loading language traineddata chi_sim': '下载中文语言包',
    'loading language traineddata eng': '下载英文语言包',
  };
  return map[status] ?? status;
}
