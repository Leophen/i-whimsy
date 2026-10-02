/**
 * CSS / 前端工具类核心算法 —— 零依赖。
 * 单位换算、流体排版、阴影、缓动曲线、玻璃拟态、有机圆角、SVG 波浪。
 */

export interface CssUnitContext {
  /** 根字号 px，rem 的基准 */
  rootFontSize: number;
  /** 父级字号 px，em 的基准 */
  parentFontSize: number;
  viewportWidth: number;
  viewportHeight: number;
}

export const DEFAULT_CSS_CTX: CssUnitContext = {
  rootFontSize: 16,
  parentFontSize: 16,
  viewportWidth: 1920,
  viewportHeight: 1080,
};

export type CssUnitId = 'px' | 'rem' | 'em' | 'vw' | 'vh' | 'pt' | 'percent' | 'in' | 'cm';

export interface CssUnitDef {
  id: CssUnitId;
  label: string;
  /** 换算到 px 需要的上下文键；absolute 表示固定换算 */
  basis: 'absolute' | 'root' | 'parent' | 'vw' | 'vh';
  /** 绝对单位的 px 系数 */
  absolute?: number;
  /** 该单位的 1 单位等于多少 px（相对单位由 basis 决定） */
  relative?: number;
}

export const CSS_UNITS: CssUnitDef[] = [
  { id: 'px', label: 'px 像素', basis: 'absolute', absolute: 1 },
  { id: 'rem', label: 'rem 根字号', basis: 'root', relative: 1 },
  { id: 'em', label: 'em 父字号', basis: 'parent', relative: 1 },
  { id: 'vw', label: 'vw 视口宽', basis: 'vw', relative: 0.01 },
  { id: 'vh', label: 'vh 视口高', basis: 'vh', relative: 0.01 },
  { id: 'pt', label: 'pt 磅', basis: 'absolute', absolute: 96 / 72 },
  { id: 'in', label: 'in 英寸', basis: 'absolute', absolute: 96 },
  { id: 'cm', label: 'cm 厘米', basis: 'absolute', absolute: 96 / 2.54 },
  { id: 'percent', label: '% 百分比', basis: 'parent', relative: 0.01 },
];

/** 某单位 1 单位对应多少 px */
export function unitToPxFactor(unit: CssUnitId, ctx: CssUnitContext): number {
  const def = CSS_UNITS.find((u) => u.id === unit);
  if (!def) return 1;
  switch (def.basis) {
    case 'absolute':
      return def.absolute ?? 1;
    case 'root':
      return ctx.rootFontSize;
    case 'parent':
      return def.relative === 0.01 ? ctx.parentFontSize * 0.01 : ctx.parentFontSize;
    case 'vw':
      return ctx.viewportWidth * (def.relative ?? 0.01);
    case 'vh':
      return ctx.viewportHeight * (def.relative ?? 0.01);
    default:
      return 1;
  }
}

export function convertCssUnit(
  value: number,
  from: CssUnitId,
  to: CssUnitId,
  ctx: CssUnitContext,
): number {
  const px = value * unitToPxFactor(from, ctx);
  return px / unitToPxFactor(to, ctx);
}

export function round(n: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/* ------------------------------------------------------------------ *
 * clamp() 流体排版
 * ------------------------------------------------------------------ */

export interface ClampInput {
  minSize: number;
  maxSize: number;
  minViewport: number;
  maxViewport: number;
  /** 结果保留几位小数 */
  precision?: number;
}

export interface ClampResult {
  /** 首选值（通常带 vw） */
  preferredRem: number;
  /** 每 1vw 变化的 rem 数 */
  vwCoefficient: number;
  css: string;
  /** 校验：视口最窄 / 最宽时实际字号 */
  atMin: number;
  atMax: number;
}

/**
 * 线性插值求 clamp 首选值。
 * 公式：slope = (maxSize - minSize) / (maxVw - minVw)
 *       yIntersection = minSize - slope * minVw
 * 用 rem 表示时把 vw 换算成 rem 需要除以根字号。
 */
export function computeClamp(input: ClampInput): ClampResult {
  const { minSize, maxSize, minViewport, maxViewport } = input;
  const precision = input.precision ?? 4;

  // 若区间非法，退化为固定值
  if (maxViewport === minViewport) {
    return {
      preferredRem: round(minSize, precision),
      vwCoefficient: 0,
      css: `clamp(${round(minSize, precision)}rem, ${round(minSize, precision)}rem)`,
      atMin: minSize,
      atMax: minSize,
    };
  }

  const slope = (maxSize - minSize) / (maxViewport - minViewport); // rem per px
  const yIntersection = minSize - slope * minViewport; // rem

  const vwCoefficient = round(slope * 100, precision); // rem per 100vw → 即 n vw
  const preferredRem = round(yIntersection, precision);

  const sign = vwCoefficient < 0 ? '-' : '+';
  const absVw = Math.abs(vwCoefficient);
  const css = `clamp(${round(minSize, precision)}rem, ${preferredRem}rem ${sign} ${absVw}vw, ${round(maxSize, precision)}rem)`;

  return {
    preferredRem,
    vwCoefficient,
    css,
    atMin: round(minSize + slope * (minViewport - minViewport), 2),
    atMax: round(minSize + slope * (maxViewport - minViewport), 2),
  };
}

/* ------------------------------------------------------------------ *
 * box-shadow
 * ------------------------------------------------------------------ */

export interface ShadowLayer {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export function buildShadowCss(layers: ShadowLayer[]): string {
  if (layers.length === 0) return 'none';
  return layers
    .map((l) => {
      const parts = [
        `${l.x}px`,
        `${l.y}px`,
        `${l.blur}px`,
        ...(l.spread !== 0 ? [`${l.spread}px`] : []),
        l.color,
      ];
      return `${l.inset ? 'inset ' : ''}${parts.join(' ')}`;
    })
    .join(', ');
}

/* ------------------------------------------------------------------ *
 * cubic-bezier
 * ------------------------------------------------------------------ */

/** 牛顿迭代求解 bezier 在给定 x 处的 t 值 */
export function bezierSolveT(x1: number, x2: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const currentX = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3;
    const derivative = 3 * (1 - t) ** 2 * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t ** 2 * (1 - x2);
    if (Math.abs(derivative) < 1e-6) break;
    const delta = currentX - x;
    if (Math.abs(delta) < 1e-6) break;
    t -= delta / derivative;
  }
  return Math.min(1, Math.max(0, t));
}

export function bezierY(y1: number, y2: number, t: number): number {
  return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3;
}

/** 采样整条曲线，用于绘制 */
export function sampleBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps = 64,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const p = i / steps;
    const t = bezierSolveT(x1, x2, p);
    out.push({ x: p, y: bezierY(y1, y2, t) });
  }
  return out;
}

export const EASING_PRESETS: { name: string; value: [number, number, number, number] }[] = [
  { name: 'linear', value: [0, 0, 1, 1] },
  { name: 'ease', value: [0.25, 0.1, 0.25, 1] },
  { name: 'ease-in', value: [0.42, 0, 1, 1] },
  { name: 'ease-out', value: [0, 0, 0.58, 1] },
  { name: 'ease-in-out', value: [0.42, 0, 0.58, 1] },
  { name: 'Material Standard', value: [0.4, 0, 0.2, 1] },
  { name: 'Material Decelerate', value: [0, 0, 0.2, 1] },
  { name: '回弹 Out Back', value: [0.34, 1.56, 0.64, 1] },
  { name: '快速进入', value: [0.5, 0, 0.1, 1] },
  { name: '缓慢退出', value: [0.16, 1, 0.3, 1] },
];

/* ------------------------------------------------------------------ *
 * glassmorphism
 * ------------------------------------------------------------------ */

export interface GlassParams {
  blur: number;
  alpha: number;
  saturate: number;
  radius: number;
  borderAlpha: number;
  borderWidth: number;
  tint: string;
  shadow: number;
}

export const DEFAULT_GLASS: GlassParams = {
  blur: 12,
  alpha: 18,
  saturate: 160,
  radius: 16,
  borderAlpha: 30,
  borderWidth: 1,
  tint: '#ffffff',
  shadow: 20,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function buildGlassCss(p: GlassParams): string {
  const { r, g, b } = hexToRgb(p.tint);
  return [
    'background: rgba(' + [r, g, b].join(', ') + ` / ${p.alpha}%);`,
    `backdrop-filter: blur(${p.blur}px) saturate(${p.saturate}%);`,
    `-webkit-backdrop-filter: blur(${p.blur}px) saturate(${p.saturate}%);`,
    `border: ${p.borderWidth}px solid rgba(${r}, ${g}, ${b}, ${(p.borderAlpha / 100).toFixed(2)});`,
    `border-radius: ${p.radius}px;`,
    `box-shadow: 0 8px 32px rgba(0, 0, 0, ${(p.shadow / 100).toFixed(2)});`,
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * 有机圆角
 * ------------------------------------------------------------------ */

export interface RadiusParams {
  tl: number;
  tr: number;
  br: number;
  bl: number;
  /** 每个角的水平/垂直不对称度 0 ~ 100 */
  tlV: number;
  trV: number;
  brV: number;
  blV: number;
  width: number;
  height: number;
}

export const DEFAULT_RADIUS: RadiusParams = {
  tl: 60,
  tr: 30,
  br: 60,
  bl: 30,
  tlV: 60,
  trV: 40,
  brV: 30,
  blV: 70,
  width: 240,
  height: 240,
};

/** 生成 border-radius 八值写法：tl-h tr-h br-h bl-h / tl-v tr-v br-v bl-v */
export function buildRadiusCss(p: RadiusParams): string {
  const h = [p.tl, p.tr, p.br, p.bl];
  const v = [
    Math.round((p.tl * p.tlV) / 100),
    Math.round((p.tr * p.trV) / 100),
    Math.round((p.br * p.brV) / 100),
    Math.round((p.bl * p.blV) / 100),
  ];
  const allEqualV = v.every((x, i) => x === h[i]);
  if (allEqualV) return `${h.join('% ')}%`;
  return `${h.join('% ')}% / ${v.join('% ')}%`;
}

/* ------------------------------------------------------------------ *
 * SVG 波浪
 * ------------------------------------------------------------------ */

export interface WaveParams {
  width: number;
  height: number;
  /** 波峰数量 */
  waves: number;
  /** 振幅（相对高度的比例 0~1） */
  amplitude: number;
  /** 基线位置（相对高度 0~1） */
  baseline: number;
  layers: number;
  /** 平滑度：越大越接近正弦，越小越接近折线 */
  smoothness: number;
  color: string;
  opacity: number;
}

export const DEFAULT_WAVE: WaveParams = {
  width: 1440,
  height: 320,
  waves: 3,
  amplitude: 0.35,
  baseline: 0.5,
  layers: 3,
  smoothness: 0.5,
  color: '#7c5cff',
  opacity: 60,
};

/** 用三次贝塞尔近似生成一条平滑波浪路径 */
export function buildWavePath(p: WaveParams, layerIndex = 0): string {
  const { width, height, waves, amplitude, baseline, smoothness } = p;
  const amp = amplitude * height * (1 - layerIndex * 0.18);
  const baseY = height * baseline + layerIndex * height * 0.06;
  const step = width / Math.max(1, waves);
  const handle = step * (0.25 + smoothness * 0.25);

  let d = `M0 ${baseY.toFixed(2)}`;
  for (let i = 0; i < waves; i += 1) {
    const x0 = i * step;
    const x1 = (i + 1) * step;
    const dir = i % 2 === 0 ? -1 : 1;
    const peakY = baseY + dir * amp;
    d += ` C${(x0 + handle).toFixed(2)} ${peakY.toFixed(2)}, ${(x1 - handle).toFixed(2)} ${peakY.toFixed(2)}, ${x1.toFixed(2)} ${baseY.toFixed(2)}`;
  }
  d += ` L${width} ${height} L0 ${height} Z`;
  return d;
}

export function buildWaveSvg(p: WaveParams): string {
  const paths = Array.from({ length: Math.max(1, p.layers) }, (_, i) => {
    const d = buildWavePath(p, i);
    const alpha = ((p.opacity / 100) * (1 - i * 0.22)).toFixed(2);
    return `  <path d="${d}" fill="${p.color}" fill-opacity="${alpha}" />`;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${p.width} ${p.height}" width="${p.width}" height="${p.height}" preserveAspectRatio="none">\n${paths}\n</svg>`;
}
