/** Canvas 高清导出 —— 按倍率重绘，禁止直接放大位图。 */

export async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('导出失败'))),
      'image/png',
    );
  });
}

/** 将源 canvas 按 pixelRatio 倍率导出 PNG。 */
export async function exportCanvasHiRes(
  source: HTMLCanvasElement,
  pixelRatio = 2,
): Promise<Blob> {
  const w = Math.round(source.width * pixelRatio);
  const h = Math.round(source.height * pixelRatio);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) throw new Error('无法创建导出画布');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return canvasToPngBlob(off);
}
