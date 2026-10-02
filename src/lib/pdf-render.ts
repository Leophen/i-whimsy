/**
 * PDF 逐页渲染为位图 —— 浏览器端专用（依赖 pdfjs-dist + Canvas）。
 */

export interface RenderedPdfPage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  pageNumber: number;
}

let pdfWorkerReady = false;

async function ensurePdfWorker(): Promise<void> {
  if (pdfWorkerReady) return;
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfWorkerReady = true;
}

/** 把 PDF 每页渲染为 2× 位图，供 OCR 使用。 */
export async function renderPdfPages(
  file: File,
  scale = 2,
  onProgress?: (page: number, total: number) => void,
): Promise<RenderedPdfPage[]> {
  await ensurePdfWorker();
  const pdfjs = await import('pdfjs-dist');
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: RenderedPdfPage[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建 Canvas 上下文');
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const bitmap = await createImageBitmap(canvas);
    pages.push({
      bitmap,
      width: canvas.width,
      height: canvas.height,
      pageNumber: i,
    });
  }

  return pages;
}
