/**
 * 颜色处理核心库 —— 纯函数，零依赖。
 * hex / rgb / hsl / hsv / cmyk / lab 互转、WCAG 2.x 对比度、色阶生成。
 *
 * 对比度算法源自 WCAG 2.1 Recommendation：
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface RGBA extends RGB {
  a: number;
}
export interface HSL {
  h: number;
  s: number;
  l: number;
}
export interface HSV {
  h: number;
  s: number;
  v: number;
}
export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round = (n: number, d = 0) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

/* ------------------------------------------------------------------ *
 * 解析
 * ------------------------------------------------------------------ */

export const HEX_RE = /^#?([0-9a-f]{3,8})$/i;

function parseHexCore(input: string): number[] | null {
  const m = HEX_RE.exec(input.trim());
  if (!m?.[1]) return null;
  let hex = m[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(Number.parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

/** 宽松解析任意颜色写法，失败返回 null。 */
export function parseColor(input: string): RGBA | null {
  const raw = input.trim();
  if (!raw) return null;

  const named = NAMED_COLORS[raw.toLowerCase().replace(/[\s_]/g, '')];
  if (named) return { ...named, a: 1 };

  const hex = parseHexCore(raw);
  if (hex) {
    return {
      r: hex[0] as number,
      g: hex[1] as number,
      b: hex[2] as number,
      a: hex[3] === undefined ? 1 : round((hex[3] as number) / 255, 3),
    };
  }

  const fn = raw.match(/^(rgba?|hsla?|hsv)\(\s*([^)]+?)\s*\)$/i);
  if (fn?.[1] && fn[2]) {
    const parts = fn[2]
      .split(/[,/\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => (p.endsWith('%') ? Number.parseFloat(p) / 100 : Number.parseFloat(p)))
      .filter((n) => Number.isFinite(n));
    const kind = fn[1].toLowerCase();
    if (kind === 'rgb' || kind === 'rgba') {
      const to255 = (idx: number) => {
        const v = parts[idx] as number;
        return Math.round(clamp01(v > 1 ? v / 255 : v) * 255);
      };
      return {
        r: to255(0),
        g: to255(1),
        b: to255(2),
        a: parts[3] === undefined ? 1 : clamp01(parts[3] as number),
      };
    }
    if (kind === 'hsl' || kind === 'hsla') {
      const rgb = hslToRgb({
        h: (((parts[0] as number) % 360) + 360) % 360,
        s: clamp01(parts[1] as number),
        l: clamp01(parts[2] as number),
      });
      return { ...rgb, a: parts[3] === undefined ? 1 : clamp01(parts[3] as number) };
    }
    if (kind === 'hsv') {
      const rgb = hsvToRgb({
        h: (((parts[0] as number) % 360) + 360) % 360,
        s: clamp01(parts[1] as number),
        v: clamp01(parts[2] as number),
      });
      return { ...rgb, a: parts[3] === undefined ? 1 : clamp01(parts[3] as number) };
    }
  }
  return null;
}

export function isValidColor(input: string): boolean {
  return parseColor(input) !== null;
}

/* ------------------------------------------------------------------ *
 * 转换
 * ------------------------------------------------------------------ */

export function rgbToHex(color: RGB, alpha = 1): string {
  const to2 = (n: number) =>
    Math.round(clamp01(n / 255) * 255)
      .toString(16)
      .padStart(2, '0');
  const base = `#${to2(color.r)}${to2(color.g)}${to2(color.b)}`;
  const a = clamp01(alpha);
  return a >= 1 ? base : `${base}${to2(Math.round(a * 255))}`;
}

export function rgbToCss({ r, g, b, a }: RGBA, forceRgba = false): string {
  return !forceRgba && a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${round(a, 3)})`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = clamp01(r / 255);
  const gn = clamp01(g / 255);
  const bn = clamp01(b / 255);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: round(l * 100, 1) };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: round(h * 360, 1), s: round(s * 100, 1), l: round(l * 100, 1) };
}

export function hslToCss({ h, s, l }: HSL, a = 1): string {
  const hs = round(((h % 360) + 360) % 360, 1);
  const ss = round(clamp01(s / 100) * 100, 1);
  const ls = round(clamp01(l / 100) * 100, 1);
  return a >= 1 ? `hsl(${hs}, ${ss}%, ${ls}%)` : `hsla(${hs}, ${ss}%, ${ls}%, ${round(a, 3)})`;
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = clamp01(s / 100);
  const ln = clamp01(l / 100);
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = ln - c / 2;
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = clamp01(r / 255);
  const gn = clamp01(g / 255);
  const bn = clamp01(b / 255);
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return {
    h: round(h, 1),
    s: round((max === 0 ? 0 : d / max) * 100, 1),
    v: round(max * 100, 1),
  };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const sn = clamp01(s / 100);
  const vn = clamp01(v / 100);
  const c = vn * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = vn - c;
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

export function hsvToCss({ h, s, v }: HSV, a = 1): string {
  const hs = round(((h % 360) + 360) % 360, 1);
  return a >= 1
    ? `hsv(${hs}, ${round(s, 1)}%, ${round(v, 1)}%)`
    : `hsva(${hs}, ${round(s, 1)}%, ${round(v, 1)}%, ${round(a, 3)})`;
}

export function rgbToCmyk({ r, g, b }: RGB): CMYK {
  const rn = clamp01(r / 255);
  const gn = clamp01(g / 255);
  const bn = clamp01(b / 255);
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: round(((1 - rn - k) / (1 - k)) * 100, 1),
    m: round(((1 - gn - k) / (1 - k)) * 100, 1),
    y: round(((1 - bn - k) / (1 - k)) * 100, 1),
    k: round(k * 100, 1),
  };
}

export function cmykToRgb({ c, m, y, k }: CMYK): RGB {
  const cn = clamp01(c / 100);
  const mn = clamp01(m / 100);
  const yn = clamp01(y / 100);
  const kn = clamp01(k / 100);
  return {
    r: Math.round(255 * (1 - cn) * (1 - kn)),
    g: Math.round(255 * (1 - mn) * (1 - kn)),
    b: Math.round(255 * (1 - yn) * (1 - kn)),
  };
}

export function cmykToCss(cmyk: CMYK): string {
  return `cmyk(${round(cmyk.c, 1)}%, ${round(cmyk.m, 1)}%, ${round(cmyk.y, 1)}%, ${round(cmyk.k, 1)}%)`;
}

/** 一次性输出全部表示法。 */
export interface ColorSet {
  rgb: RGB;
  hex: string;
  rgbCss: string;
  rgbaCss: string;
  hsl: HSL;
  hslCss: string;
  hsv: HSV;
  hsvCss: string;
  cmyk: CMYK;
  cmykCss: string;
}

export function toColorSet(input: string): ColorSet | null {
  const rgba = parseColor(input);
  if (!rgba) return null;
  const { r, g, b, a } = rgba;
  const hsl = rgbToHsl({ r, g, b });
  const hsv = rgbToHsv({ r, g, b });
  const cmyk = rgbToCmyk({ r, g, b });
  return {
    rgb: { r, g, b },
    hex: rgbToHex({ r, g, b }, a),
    rgbCss: `rgb(${r}, ${g}, ${b})`,
    rgbaCss: `rgba(${r}, ${g}, ${b}, ${round(a, 3)})`,
    hsl,
    hslCss: hslToCss(hsl, a),
    hsv,
    hsvCss: hsvToCss(hsv, a),
    cmyk,
    cmykCss: cmykToCss(cmyk),
  };
}

/* ------------------------------------------------------------------ *
 * WCAG 对比度
 * ------------------------------------------------------------------ */

/** sRGB 通道线性化。 */
function channelLuminance(value0to255: number): number {
  const c = clamp01(value0to255 / 255);
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** 相对亮度 L，取值 0(黑) ~ 1(白)。 */
export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Alpha 合成：把带透明度的前景色叠到背景色上。 */
export function rgbaToRgb(fg: RGBA, bg: RGB): RGB {
  if (fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b };
  const a = clamp01(fg.a);
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
  };
}

/** 对比度比值，范围 1 ~ 21。 */
export function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return round((light + 0.05) / (dark + 0.05), 2);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export interface ContrastResult {
  ratio: number;
  /** 普通文本 AAA (≥7) */
  normalAAA: boolean;
  /** 普通文本 AA (≥4.5) */
  normalAA: boolean;
  /** 大文本 AAA (≥4.5) */
  largeAAA: boolean;
  /** 大文本 AA (≥3) */
  largeAA: boolean;
  /** 非文本 UI 组件 (≥3) */
  uiAA: boolean;
  level: WcagLevel;
}

/** 按 WCAG 2.1 SC 1.4.3 / 1.4.6 判定等级。 */
export function checkContrast(fg: string, bg: string): ContrastResult | null {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (!f || !b) return null;
  const bgRgb = { r: b.r, g: b.g, b: b.b };
  const ratio = contrastRatio(rgbaToRgb(f, bgRgb), bgRgb);
  const normalAAA = ratio >= 7;
  const normalAA = ratio >= 4.5;
  const largeAAA = ratio >= 4.5;
  const largeAA = ratio >= 3;
  const level: WcagLevel = normalAAA ? 'AAA' : normalAA ? 'AA' : largeAA ? 'AA Large' : 'Fail';
  return { ratio, normalAAA, normalAA, largeAAA, largeAA, uiAA: ratio >= 3, level };
}

/** 建议的文本色：在给定背景上返回黑或白，取对比度更高者。 */
export function readableTextColor(bg: string): '#000000' | '#ffffff' {
  const parsed = parseColor(bg);
  if (!parsed) return '#000000';
  const rgb = { r: parsed.r, g: parsed.g, b: parsed.b };
  return contrastRatio(rgb, { r: 0, g: 0, b: 0 }) >= contrastRatio(rgb, { r: 255, g: 255, b: 255 })
    ? '#000000'
    : '#ffffff';
}

/* ------------------------------------------------------------------ *
 * 色阶 / 派生色
 * ------------------------------------------------------------------ */

/** 生成 n 阶色卡：围绕给定 HSL，在明度轴上均匀展开。 */
export function generateShades(input: string, count = 10): string[] {
  const rgba = parseColor(input);
  if (!rgba) return [];
  const base = rgbToHsl({ r: rgba.r, g: rgba.g, b: rgba.b });
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    // 映射到 8% ~ 92%，避开纯黑/纯白，视觉上更耐看
    const l = 92 - (i / Math.max(1, count - 1)) * 84;
    out.push(rgbToHex(hslToRgb({ h: base.h, s: base.s, l })));
  }
  return out;
}

/** 互补色 / 分裂互补 / 类似色 / 三角 / 四方 → 一组和谐色。 */
export type HarmonyMode = 'complementary' | 'analogous' | 'triadic' | 'tetradic' | 'split';

export function generateHarmony(input: string, mode: HarmonyMode): string[] {
  const rgba = parseColor(input);
  if (!rgba) return [];
  const { h, s, l } = rgbToHsl({ r: rgba.r, g: rgba.g, b: rgba.b });
  const offsets: Record<HarmonyMode, number[]> = {
    complementary: [0, 180],
    analogous: [-30, 0, 30],
    triadic: [0, 120, 240],
    tetradic: [0, 90, 180, 270],
    split: [0, 150, 210],
  };
  return (offsets[mode] ?? []).map((o) => rgbToHex(hslToRgb({ h: h + o, s, l })));
}

/* ------------------------------------------------------------------ *
 * OKLCH —— 感知均匀的色阶生成（color-system 工具使用）
 * 算法源自 CSS Color Module Level 4 / Björn Ottosson 的 OKLab
 * ------------------------------------------------------------------ */

export interface OKLCH {
  /** 感知亮度 0–1 */
  l: number;
  /** 彩度 */
  c: number;
  /** 色相 0–360 */
  h: number;
}

const LINEARIZE = (c: number) => {
  const v = clamp01(c / 255);
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const DELINEARIZE = (c: number) => {
  const v = clamp01(c);
  return v <= 0.0031308 ? v * 12.92 * 255 : (1.055 * v ** (1 / 2.4) - 0.055) * 255;
};

function rgbToOklab({ r, g, b }: RGB): { l: number; a: number; b: number } {
  const lr = LINEARIZE(r);
  const lg = LINEARIZE(g);
  const lb = LINEARIZE(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    l: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.3575474782 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb(lab: { l: number; a: number; b: number }): RGB {
  const l_ = lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return {
    r: Math.round(DELINEARIZE(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: Math.round(DELINEARIZE(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: Math.round(DELINEARIZE(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  };
}

export function rgbToOklch(rgb: RGB): OKLCH {
  const lab = rgbToOklab(rgb);
  const c = Math.hypot(lab.a, lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: lab.l, c, h: round(h, 1) };
}

export function oklchToRgb({ l, c, h }: OKLCH): RGB {
  const rad = (h * Math.PI) / 180;
  return oklabToRgb({ l, a: c * Math.cos(rad), b: c * Math.sin(rad) });
}

export function oklchToHex(oklch: OKLCH): string {
  return rgbToHex(oklchToRgb(oklch));
}

/** Tailwind 风格 11 级色阶步进。 */
export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];

/** 亮度锚点：500 对齐输入主色，两端向极浅/极深展开。 */
const LIGHTNESS_MAP: Record<ScaleStep, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.88,
  300: 0.8,
  400: 0.7,
  500: 0.55,
  600: 0.45,
  700: 0.37,
  800: 0.27,
  900: 0.2,
  950: 0.14,
};

export interface ColorScale {
  step: ScaleStep;
  hex: string;
  oklch: OKLCH;
  contrastOnWhite: ContrastResult | null;
  contrastOnBlack: ContrastResult | null;
}

/** 从主色生成 OKLCH 色阶。 */
export function generateOklchScale(input: string): ColorScale[] {
  const rgba = parseColor(input);
  if (!rgba) return [];
  const base = rgbToOklch({ r: rgba.r, g: rgba.g, b: rgba.b });
  const baseL = base.l;

  return SCALE_STEPS.map((step) => {
    const targetL = LIGHTNESS_MAP[step];
    const ratio = targetL / Math.max(0.01, baseL);
    const c = base.c * (step <= 400 ? 0.85 + ratio * 0.1 : step >= 700 ? 0.75 : 1);
    const oklch: OKLCH = { l: targetL, c: Math.max(0, c), h: base.h };
    const hex = oklchToHex(oklch);
    return {
      step,
      hex,
      oklch,
      contrastOnWhite: checkContrast(hex, '#ffffff'),
      contrastOnBlack: checkContrast(hex, '#000000'),
    };
  });
}

export interface SemanticPalette {
  success: ColorScale[];
  warning: ColorScale[];
  danger: ColorScale[];
  info: ColorScale[];
}

const SEMANTIC_BASE: Record<keyof SemanticPalette, string> = {
  success: '#16a34a',
  warning: '#ca8a04',
  danger: '#dc2626',
  info: '#2563eb',
};

export function generateSemanticPalettes(): SemanticPalette {
  return {
    success: generateOklchScale(SEMANTIC_BASE.success),
    warning: generateOklchScale(SEMANTIC_BASE.warning),
    danger: generateOklchScale(SEMANTIC_BASE.danger),
    info: generateOklchScale(SEMANTIC_BASE.info),
  };
}

/** 深色模式：亮度轴反转并降低彩度。 */
export function generateDarkScale(lightScale: ColorScale[]): ColorScale[] {
  const reversed = [...lightScale].reverse();
  return reversed.map((item, i) => {
    const step = SCALE_STEPS[i];
    const oklch: OKLCH = {
      l: item.oklch.l,
      c: item.oklch.c * 0.82,
      h: item.oklch.h,
    };
    const hex = oklchToHex(oklch);
    return {
      step,
      hex,
      oklch,
      contrastOnWhite: checkContrast(hex, '#ffffff'),
      contrastOnBlack: checkContrast(hex, '#000000'),
    };
  });
}

export function exportCssVariables(
  name: string,
  scale: ColorScale[],
  darkScale?: ColorScale[],
): string {
  const lines = scale.map((s) => `  --${name}-${s.step}: ${s.hex};`);
  const dark =
    darkScale?.map((s) => `    --${name}-${s.step}: ${s.hex};`).join('\n') ?? '';
  return `:root {\n${lines.join('\n')}\n}\n\n.dark {\n${dark}\n}`;
}

export function exportTailwindConfig(name: string, scale: ColorScale[]): string {
  const entries = scale.map((s) => `        ${s.step}: '${s.hex}',`).join('\n');
  return `// tailwind.config 片段\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        ${name}: {\n${entries}\n        },\n      },\n    },\n  },\n};`;
}

export function exportDesignTokens(name: string, scale: ColorScale[]): string {
  const tokens = scale.map((s) => ({
    name: `${name}.${s.step}`,
    value: s.hex,
    oklch: `oklch(${round(s.oklch.l * 100, 1)}% ${round(s.oklch.c, 3)} ${s.oklch.h})`,
  }));
  return JSON.stringify({ [name]: tokens }, null, 2);
}

/** HSL 空间线性插值，用于渐变中间色。 */
export function mixColors(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return a;
  return rgbToHex({
    r: Math.round(ca.r + (cb.r - ca.r) * t),
    g: Math.round(ca.g + (cb.g - ca.g) * t),
    b: Math.round(ca.b + (cb.b - ca.b) * t),
  });
}

/* ------------------------------------------------------------------ *
 * 常用色名（CSS named colors 精选）
 * ------------------------------------------------------------------ */
export const NAMED_COLORS: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  silver: { r: 192, g: 192, b: 192 },
  maroon: { r: 128, g: 0, b: 0 },
  olive: { r: 128, g: 128, b: 0 },
  lime: { r: 0, g: 255, b: 0 },
  aqua: { r: 0, g: 255, b: 255 },
  teal: { r: 0, g: 128, b: 128 },
  navy: { r: 0, g: 0, b: 128 },
  fuchsia: { r: 255, g: 0, b: 255 },
  purple: { r: 128, g: 0, b: 128 },
  orange: { r: 255, g: 165, b: 0 },
  pink: { r: 255, g: 192, b: 203 },
  tomato: { r: 255, g: 99, b: 71 },
  gold: { r: 255, g: 215, b: 0 },
  indigo: { r: 75, g: 0, b: 130 },
  violet: { r: 238, g: 130, b: 238 },
  brown: { r: 165, g: 42, b: 42 },
  salmon: { r: 250, g: 128, b: 114 },
  coral: { r: 255, g: 127, b: 80 },
  crimson: { r: 220, g: 20, b: 60 },
  khaki: { r: 240, g: 230, b: 140 },
  lavender: { r: 230, g: 230, b: 250 },
  beige: { r: 245, g: 245, b: 220 },
  ivory: { r: 255, g: 255, b: 240 },
  mint: { r: 245, g: 255, b: 250 },
  skyblue: { r: 135, g: 206, b: 235 },
  royalblue: { r: 65, g: 105, b: 225 },
  transparent: { r: 0, g: 0, b: 0 },
};
