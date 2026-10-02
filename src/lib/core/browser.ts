/**
 * 浏览器端通用工具：剪贴板、下载、文件读取。
 * 全部纯客户端 API，禁止在 Server Component 中调用。
 */

/** 复制文本到剪贴板，带 execCommand 兜底（非安全上下文）。 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 继续走兜底 */
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/** 触发浏览器下载（Blob / dataURL / 字符串均可）。 */
export function downloadFile(data: Blob | string, filename: string, mimeType?: string): void {
  const blob =
    typeof data === 'string'
      ? new Blob([data], { type: mimeType ?? 'text/plain;charset=utf-8' })
      : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 留出足够时间让浏览器启动下载，再释放对象 URL
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** File → data URL(base64)。 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/** File → ArrayBuffer。 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsArrayBuffer(file);
  });
}

/** 用 URL 加载图片并等待解码完成。 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

/**
 * 校验文件是否符合 accept 规则。
 * 支持 MIME 精确（image/png）、通配符（image/*）与扩展名（.png / png）。
 */
export function isAcceptFile(file: File, accept: string | string[]): boolean {
  const rules = (Array.isArray(accept) ? accept : accept.split(','))
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return rules.some((rule) => {
    if (rule === '*' || rule === '*/*') return true;
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.includes('/*')) {
      const prefix = rule.slice(0, rule.indexOf('/') + 1);
      return type.startsWith(prefix);
    }
    return type === rule;
  });
}

/** 从 Blob 的 MIME 推断文件扩展名（不含点）。 */
export function guessExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/avif': 'avif',
    'application/json': 'json',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/pdf': 'pdf',
  };
  return map[mime.toLowerCase()] ?? 'bin';
}

/** 保留扩展名地替换文件名。 */
export function renameWithExt(filename: string, ext: string): string {
  const base = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename;
  const safe = base.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'download';
  return `${safe}.${ext.replace(/^\./, '')}`;
}
