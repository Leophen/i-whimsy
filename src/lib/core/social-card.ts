/**
 * 社交封面卡片 —— 平台尺寸模板与 Canvas 渲染，零依赖。
 */

export interface SocialPlatform {
  id: string;
  name: string;
  width: number;
  height: number;
  /** 安全区（信息流裁切区域） */
  safeArea?: { x: number; y: number; width: number; height: number };
}

export interface CardLayout {
  id: string;
  name: string;
  titleAlign: 'center' | 'left';
  titleY: number;
  subtitleY: number;
  tagY?: number;
}

export interface GradientPreset {
  id: string;
  name: string;
  colors: [string, string];
  angle: number;
}

export interface CardContent {
  title: string;
  subtitle: string;
  tag?: string;
}

export interface CardStyle {
  platformId: string;
  layoutId: string;
  gradientId: string;
  backgroundImage?: HTMLImageElement | null;
  bgBlur: number;
  bgDarken: number;
  fontWeight: 'normal' | 'bold';
  textColor: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'wechat',
    name: '公众号封面',
    width: 900,
    height: 383,
    safeArea: { x: 0, y: 0, width: 900, height: 383 },
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    width: 1080,
    height: 1440,
    safeArea: { x: 54, y: 120, width: 972, height: 1200 },
  },
  {
    id: 'bilibili',
    name: 'B站封面',
    width: 1146,
    height: 717,
    safeArea: { x: 40, y: 40, width: 1066, height: 637 },
  },
  {
    id: 'youtube',
    name: 'YouTube 缩略图',
    width: 1280,
    height: 720,
    safeArea: { x: 60, y: 40, width: 1160, height: 640 },
  },
  {
    id: 'og',
    name: 'OG 分享图',
    width: 1200,
    height: 630,
    safeArea: { x: 40, y: 40, width: 1120, height: 550 },
  },
];

export const CARD_LAYOUTS: CardLayout[] = [
  { id: 'center', name: '居中大标题', titleAlign: 'center', titleY: 0.42, subtitleY: 0.58 },
  { id: 'left', name: '左对齐', titleAlign: 'left', titleY: 0.38, subtitleY: 0.55, tagY: 0.22 },
  { id: 'bottom', name: '底部标题', titleAlign: 'left', titleY: 0.72, subtitleY: 0.84, tagY: 0.62 },
  { id: 'hero', name: '图片为主', titleAlign: 'center', titleY: 0.78, subtitleY: 0.88 },
  { id: 'minimal', name: '极简纯色', titleAlign: 'center', titleY: 0.45, subtitleY: 0.58 },
  { id: 'tagged', name: '带标签', titleAlign: 'left', titleY: 0.4, subtitleY: 0.56, tagY: 0.24 },
];

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'violet', name: '紫罗兰', colors: ['#667eea', '#764ba2'], angle: 135 },
  { id: 'sunset', name: '日落', colors: ['#f093fb', '#f5576c'], angle: 120 },
  { id: 'ocean', name: '海洋', colors: ['#2193b0', '#6dd5ed'], angle: 160 },
  { id: 'forest', name: '森林', colors: ['#134e5e', '#71b280'], angle: 140 },
  { id: 'ember', name: '余烬', colors: ['#cb2d3e', '#ef473a'], angle: 135 },
  { id: 'midnight', name: '午夜', colors: ['#0f0c29', '#302b63'], angle: 180 },
  { id: 'gold', name: '金辉', colors: ['#f7971e', '#ffd200'], angle: 90 },
  { id: 'slate', name: '石板', colors: ['#334155', '#64748b'], angle: 145 },
];

const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const chars = text.split('');
  const lines: string[] = [];
  let line = '';
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
  weight: string,
  family: string,
): number {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapText(ctx, text, maxWidth);
    const height = lines.length * size * 1.15;
    const widest = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    if (widest <= maxWidth && height <= maxHeight) return size;
    size -= 2;
  }
  return 12;
}

export function renderSocialCard(
  canvas: HTMLCanvasElement,
  content: CardContent,
  style: CardStyle,
  scale = 1,
): void {
  const platform = SOCIAL_PLATFORMS.find((p) => p.id === style.platformId) ?? SOCIAL_PLATFORMS[0];
  const layout = CARD_LAYOUTS.find((l) => l.id === style.layoutId) ?? CARD_LAYOUTS[0];
  const gradient = GRADIENT_PRESETS.find((g) => g.id === style.gradientId) ?? GRADIENT_PRESETS[0];

  const w = platform.width * scale;
  const h = platform.height * scale;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const pad = w * 0.08;

  if (style.backgroundImage) {
    ctx.filter = style.bgBlur > 0 ? `blur(${style.bgBlur * scale}px)` : 'none';
    const img = style.backgroundImage;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = w / h;
    let dw = w;
    let dh = h;
    if (ir > cr) {
      dh = h;
      dw = h * ir;
    } else {
      dw = w;
      dh = w / ir;
    }
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    ctx.filter = 'none';
    if (style.bgDarken > 0) {
      ctx.fillStyle = `rgba(0,0,0,${style.bgDarken})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else {
    const rad = (gradient.angle * Math.PI) / 180;
    const x0 = w / 2 - Math.cos(rad) * w;
    const y0 = h / 2 - Math.sin(rad) * h;
    const x1 = w / 2 + Math.cos(rad) * w;
    const y1 = h / 2 + Math.sin(rad) * h;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, gradient.colors[0]);
    g.addColorStop(1, gradient.colors[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.fillStyle = style.textColor;
  ctx.textBaseline = 'middle';

  const weight = style.fontWeight === 'bold' ? '700' : '500';
  const maxTextW = layout.titleAlign === 'center' ? w - pad * 2 : w - pad * 2;

  if (layout.tagY && content.tag) {
    const tagSize = Math.round(h * 0.028 * scale);
    ctx.font = `600 ${tagSize}px ${FONT_STACK}`;
    ctx.textAlign = layout.titleAlign;
    const tx = layout.titleAlign === 'center' ? w / 2 : pad;
    const ty = h * layout.tagY;
    const tw = ctx.measureText(content.tag).width + tagSize;
    const th = tagSize * 1.8;
    const bx = layout.titleAlign === 'center' ? tx - tw / 2 : pad - tagSize * 0.4;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, bx, ty - th / 2, tw, th, tagSize * 0.4);
    ctx.fill();
    ctx.fillStyle = style.textColor;
    ctx.fillText(content.tag, tx, ty);
  }

  const titleSize = fitFontSize(
    ctx,
    content.title || '标题',
    maxTextW,
    h * 0.25,
    Math.round(h * 0.09 * scale),
    weight,
    FONT_STACK,
  );
  ctx.font = `${weight} ${titleSize}px ${FONT_STACK}`;
  ctx.textAlign = layout.titleAlign;
  const titleX = layout.titleAlign === 'center' ? w / 2 : pad;
  const titleLines = wrapText(ctx, content.title || '标题', maxTextW);
  const titleStartY = h * layout.titleY - ((titleLines.length - 1) * titleSize * 1.15) / 2;
  titleLines.forEach((line, i) => {
    ctx.fillText(line, titleX, titleStartY + i * titleSize * 1.15);
  });

  if (content.subtitle) {
    const subSize = Math.round(titleSize * 0.42);
    ctx.font = `400 ${subSize}px ${FONT_STACK}`;
    const subLines = wrapText(ctx, content.subtitle, maxTextW);
    const subY = h * layout.subtitleY;
    subLines.forEach((line, i) => {
      ctx.globalAlpha = 0.85;
      ctx.fillText(line, titleX, subY + i * subSize * 1.2);
      ctx.globalAlpha = 1;
    });
  }

  if (platform.safeArea && scale === 1) {
    const s = platform.safeArea;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(s.x, s.y, s.width, s.height);
    ctx.setLineDash([]);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function cardToBlob(
  content: CardContent,
  style: CardStyle,
  pixelRatio = 1,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  renderSocialCard(canvas, content, style, pixelRatio);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('导出失败'))),
      'image/png',
    );
  });
}
