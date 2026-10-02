/// <reference lib="webworker" />

import { createWorker, OEM, PSM, type LoggerMessage } from 'tesseract.js';

import {
  LANG_PACK_INFO,
  type LangPackMode,
  type OcrPsm,
  type OcrWord,
} from '@/lib/core/ocr';
import { preprocessBitmapForOcr, type OcrPreprocessConfig } from '@/lib/core/ocr-preprocess';

type WorkerRequest =
  | { type: 'init'; id: number; langMode: LangPackMode; languages?: string }
  | {
      type: 'recognize';
      id: number;
      bitmap: ImageBitmap;
      rectangle?: { left: number; top: number; width: number; height: number };
      psm?: OcrPsm;
      preprocess?: OcrPreprocessConfig;
      rotateAuto?: boolean;
    }
  | { type: 'terminate'; id: number };

type WorkerResponse =
  | { type: 'ready'; id: number }
  | { type: 'progress'; id: number; status: string; progress: number }
  | {
      type: 'result';
      id: number;
      text: string;
      words: OcrWord[];
      confidence: number;
    }
  | { type: 'error'; id: number; message: string }
  | { type: 'terminated'; id: number };

let tessWorker: Awaited<ReturnType<typeof createWorker>> | null = null;

function psmFromCode(code: OcrPsm): PSM {
  switch (code) {
    case '6':
      return PSM.SINGLE_BLOCK;
    case '11':
      return PSM.SPARSE_TEXT;
    default:
      return PSM.AUTO;
  }
}

function extractWords(data: {
  blocks: Array<{
    paragraphs: Array<{
      lines: Array<{
        words: Array<{ text: string; confidence: number; bbox: OcrWord['bbox'] }>;
      }>;
    }>;
  }> | null;
}): OcrWord[] {
  const words: OcrWord[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const word of line.words) {
          if (!word.text.trim()) continue;
          words.push({
            text: word.text,
            confidence: word.confidence,
            bbox: word.bbox,
          });
        }
      }
    }
  }
  return words;
}

async function initWorker(
  langMode: LangPackMode,
  languages: string,
  jobId: number,
): Promise<void> {
  if (tessWorker) {
    await tessWorker.terminate();
    tessWorker = null;
  }

  const langPath = LANG_PACK_INFO[langMode].path;
  tessWorker = await createWorker(languages, OEM.LSTM_ONLY, {
    langPath,
    logger: (m: LoggerMessage) => {
      const msg: WorkerResponse = {
        type: 'progress',
        id: jobId,
        status: m.status,
        progress: m.progress,
      };
      self.postMessage(msg);
    },
  });

  await tessWorker.setParameters({
    user_defined_dpi: '300',
    preserve_interword_spaces: '0',
  });
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  const { id } = msg;

  try {
    if (msg.type === 'init') {
      await initWorker(msg.langMode, msg.languages ?? 'chi_sim+eng', id);
      self.postMessage({ type: 'ready', id } satisfies WorkerResponse);
      return;
    }

    if (msg.type === 'terminate') {
      if (tessWorker) {
        await tessWorker.terminate();
        tessWorker = null;
      }
      self.postMessage({ type: 'terminated', id } satisfies WorkerResponse);
      return;
    }

    if (msg.type === 'recognize') {
      if (!tessWorker) throw new Error('OCR 引擎尚未初始化');

      const { bitmap, rectangle, psm, preprocess, rotateAuto } = msg;
      const canvas = preprocessBitmapForOcr(bitmap, preprocess);
      bitmap.close();

      await tessWorker.setParameters({
        tessedit_pageseg_mode: psmFromCode(psm ?? '3'),
      });

      const result = await tessWorker.recognize(
        canvas,
        {
          rectangle,
          rotateAuto: rotateAuto ?? false,
        },
        { blocks: true },
        String(id),
      );

      const words = extractWords(result.data);
      const confidence =
        words.length > 0
          ? Math.round(words.reduce((sum, w) => sum + w.confidence, 0) / words.length)
          : 0;

      self.postMessage({
        type: 'result',
        id,
        text: result.data.text.trim(),
        words,
        confidence,
      } satisfies WorkerResponse);
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      id,
      message: err instanceof Error ? err.message : 'OCR 识别失败',
    } satisfies WorkerResponse);
  }
};
