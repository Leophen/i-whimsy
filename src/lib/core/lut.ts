/**
 * LUT 调色核心 —— .cube 解析、WebGL2 3D 纹理查找、Lab 空间 Reinhard 仿色。
 * 纯浏览器端，无外部依赖。
 */

import { createCanvas, canvasToBlob, type OutputMime } from './image';

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

export interface Lut3D {
  size: number;
  /** RGB 0–1，长度 = size³ × 3，R 通道变化最快 */
  data: Float32Array;
  title?: string;
}

export interface GradeAdjustments {
  /** 曝光 EV，-2 ~ 2 */
  exposure: number;
  /** 对比度，-100 ~ 100 */
  contrast: number;
  /** 色温，-100（冷）~ 100（暖） */
  temperature: number;
  /** 饱和度，-100 ~ 100 */
  saturation: number;
}

export const DEFAULT_ADJUSTMENTS: GradeAdjustments = {
  exposure: 0,
  contrast: 0,
  temperature: 0,
  saturation: 0,
};

export interface LabStats {
  mean: [number, number, number];
  std: [number, number, number];
}

export type GradeMode = 'lut' | 'transfer';

export interface GradeOptions {
  mode: GradeMode;
  adjustments: GradeAdjustments;
  /** LUT 强度 0–100 */
  strength: number;
  lut: Lut3D | null;
  /** 仿色：参考图统计 */
  referenceStats: LabStats | null;
  /** 仿色：目标图统计（运行时计算） */
  targetStats: LabStats | null;
  /** 仿色强度 0–100 */
  transferStrength: number;
}

export interface GradeResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export interface LutPreset {
  id: string;
  name: string;
  description: string;
  /** 用于预设卡片预览的渐变色 */
  preview: [string, string];
}

/* ------------------------------------------------------------------ *
 * .cube 解析
 * ------------------------------------------------------------------ */

export function parseCubeLut(text: string): Lut3D {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let title = '';
  const values: number[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    if (/^TITLE\b/i.test(line)) {
      title = line
        .replace(/^TITLE\s*/i, '')
        .replace(/^["']|["']$/g, '')
        .trim();
      continue;
    }
    if (/^LUT_3D_SIZE\b/i.test(line)) {
      const parts = line.split(/\s+/);
      size = Number.parseInt(parts[1] ?? '', 10);
      continue;
    }
    if (/^DOMAIN_/i.test(line) || /^LUT_1D/i.test(line)) continue;

    const parts = line.split(/\s+/).map(Number);
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      values.push(parts[0], parts[1], parts[2]);
    }
  }

  if (!size || size < 2) throw new Error('无效的 .cube 文件：缺少 LUT_3D_SIZE');
  const expected = size * size * size * 3;
  if (values.length < expected) {
    throw new Error(`LUT 数据不完整：需要 ${expected} 个分量，实际 ${values.length}`);
  }

  const data = new Float32Array(expected);
  for (let i = 0; i < expected; i += 1) {
    data[i] = clamp01(values[i] as number);
  }

  return { size, data, title: title || undefined };
}

/* ------------------------------------------------------------------ *
 * 内置预设 LUT（程序化生成，无版权风险）
 * ------------------------------------------------------------------ */

type LutTransform = (r: number, g: number, b: number) => [number, number, number];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const PRESET_TRANSFORMS: Record<string, LutTransform> = {
  cinematic: (r, g, b) => {
    const y = luma(r, g, b);
    const shadow = 1 - smoothstep(0.15, 0.55, y);
    const highlight = smoothstep(0.45, 0.85, y);
    return [
      clamp01(r + highlight * 0.12 - shadow * 0.04),
      clamp01(g - shadow * 0.06 + highlight * 0.02),
      clamp01(b + shadow * 0.14 - highlight * 0.05),
    ];
  },
  warm: (r, g, b) => {
    const y = luma(r, g, b);
    const lift = smoothstep(0, 0.35, y) * 0.06;
    return [clamp01(r * 1.08 + lift), clamp01(g * 1.02 + lift * 0.5), clamp01(b * 0.92)];
  },
  cool: (r, g, b) => [
    clamp01(r * 0.92),
    clamp01(g * 0.98),
    clamp01(b * 1.1 + (1 - luma(r, g, b)) * 0.04),
  ],
  vintage: (r, g, b) => {
    const y = luma(r, g, b);
    const fade = 0.88 + y * 0.08;
    const nr = r * fade + 0.04;
    const ng = g * fade + 0.02;
    const nb = b * (fade - 0.05) + 0.03;
    const sat = 0.75;
    const avg = (nr + ng + nb) / 3;
    return [
      clamp01(avg + (nr - avg) * sat),
      clamp01(avg + (ng - avg) * sat),
      clamp01(avg + (nb - avg) * sat),
    ];
  },
  moody: (r, g, b) => {
    const y = luma(r, g, b);
    const crush = smoothstep(0, 0.4, y);
    return [
      clamp01((r - 0.02) * (0.7 + crush * 0.3)),
      clamp01((g - 0.03) * (0.7 + crush * 0.3)),
      clamp01((b + 0.02) * (0.75 + crush * 0.25)),
    ];
  },
  punchy: (r, g, b) => {
    const c = (v: number) => clamp01((v - 0.5) * 1.25 + 0.5);
    const nr = c(r);
    const ng = c(g);
    const nb = c(b);
    const avg = (nr + ng + nb) / 3;
    const sat = 1.35;
    return [
      clamp01(avg + (nr - avg) * sat),
      clamp01(avg + (ng - avg) * sat),
      clamp01(avg + (nb - avg) * sat),
    ];
  },
  golden: (r, g, b) => {
    const y = luma(r, g, b);
    const glow = smoothstep(0.3, 0.9, y);
    return [clamp01(r * 1.1 + glow * 0.08), clamp01(g * 1.05 + glow * 0.04), clamp01(b * 0.85)];
  },
  bleach: (r, g, b) => {
    const y = luma(r, g, b);
    const hi = smoothstep(0.5, 1, y);
    return [
      clamp01(r + hi * 0.15),
      clamp01(g + hi * 0.12),
      clamp01(b + hi * 0.08 - (1 - y) * 0.03),
    ];
  },
};

export const BUILTIN_LUT_PRESETS: LutPreset[] = [
  { id: 'cinematic', name: '电影青橙', description: '阴影偏青、高光偏暖', preview: ['#1a3a4a', '#e8a060'] },
  { id: 'warm', name: '暖阳', description: '柔和暖调', preview: ['#4a3020', '#f0c080'] },
  { id: 'cool', name: '冷调', description: '清冷蓝色氛围', preview: ['#1a2840', '#80a8d0'] },
  { id: 'vintage', name: '复古胶片', description: '褪色暖黄', preview: ['#3a3530', '#d8c8a0'] },
  { id: 'moody', name: '暗调情绪', description: '压低暗部', preview: ['#0a0c10', '#404860'] },
  { id: 'punchy', name: '鲜明', description: '高对比高饱和', preview: ['#202020', '#ff6040'] },
  { id: 'golden', name: '黄金时刻', description: '日落暖光', preview: ['#302010', '#f0a040'] },
  { id: 'bleach', name: '漂白', description: '高光过曝风格', preview: ['#606060', '#f0f0e8'] },
];

export function generatePresetLut(presetId: string, size = 17): Lut3D {
  const transform = PRESET_TRANSFORMS[presetId];
  if (!transform) throw new Error(`未知预设：${presetId}`);

  const preset = BUILTIN_LUT_PRESETS.find((p) => p.id === presetId);
  const data = new Float32Array(size * size * size * 3);
  let idx = 0;

  for (let bi = 0; bi < size; bi += 1) {
    const b = bi / (size - 1);
    for (let gi = 0; gi < size; gi += 1) {
      const g = gi / (size - 1);
      for (let ri = 0; ri < size; ri += 1) {
        const r = ri / (size - 1);
        const [nr, ng, nb] = transform(r, g, b);
        data[idx++] = nr;
        data[idx++] = ng;
        data[idx++] = nb;
      }
    }
  }

  return { size, data, title: preset?.name };
}

export function lutToCubeText(lut: Lut3D): string {
  const lines = [`TITLE "${lut.title ?? 'Generated LUT'}"`, `LUT_3D_SIZE ${lut.size}`, ''];
  const { size, data } = lut;
  let idx = 0;
  for (let bi = 0; bi < size; bi += 1) {
    for (let gi = 0; gi < size; gi += 1) {
      for (let ri = 0; ri < size; ri += 1) {
        lines.push(
          `${data[idx].toFixed(6)} ${data[idx + 1].toFixed(6)} ${data[idx + 2].toFixed(6)}`,
        );
        idx += 3;
      }
    }
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ *
 * CIE Lab（Reinhard 仿色用）
 * ------------------------------------------------------------------ */

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  let x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375;
  const y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175;
  let z = lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041;

  x /= 0.95047;
  z /= 1.08883;

  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** 从 ImageData 计算 Lab 均值与标准差（降采样加速）。 */
export function computeLabStats(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sampleStep = 4,
): LabStats {
  const sums = [0, 0, 0];
  const sumSq = [0, 0, 0];
  let count = 0;

  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] as number;
      if (a < 125) continue;
      const lab = rgbToLab(data[i] as number, data[i + 1] as number, data[i + 2] as number);
      for (let c = 0; c < 3; c += 1) {
        sums[c] += lab[c];
        sumSq[c] += lab[c] * lab[c];
      }
      count += 1;
    }
  }

  if (count === 0) {
    return { mean: [50, 0, 0], std: [1, 1, 1] };
  }

  const mean: [number, number, number] = [
    sums[0] / count,
    sums[1] / count,
    sums[2] / count,
  ];
  const std: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c += 1) {
    const variance = Math.max(1e-6, sumSq[c] / count - mean[c] * mean[c]);
    std[c] = Math.sqrt(variance);
  }

  return { mean, std };
}

export function computeLabStatsFromImage(
  image: HTMLImageElement,
  maxSide = 320,
): LabStats {
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const w = Math.max(1, Math.round(image.naturalWidth * ratio));
  const h = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('无法创建 Canvas');
  ctx.drawImage(image, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return computeLabStats(data, w, h, 2);
}

/* ------------------------------------------------------------------ *
 * WebGL2 检测
 * ------------------------------------------------------------------ */

export function isWebGL2Available(): boolean {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  return canvas.getContext('webgl2') !== null;
}

/* ------------------------------------------------------------------ *
 * WebGL2 调色渲染器
 * ------------------------------------------------------------------ */

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;
precision highp sampler3D;

uniform sampler2D u_image;
uniform sampler3D u_lut;
uniform float u_lutStrength;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_temperature;
uniform float u_saturation;
uniform int u_useLut;
uniform int u_useTransfer;
uniform vec3 u_srcMean;
uniform vec3 u_srcStd;
uniform vec3 u_refMean;
uniform vec3 u_refStd;
uniform float u_transferStrength;

in vec2 v_uv;
out vec4 outColor;

vec3 srgbToLinear(vec3 c) {
  return pow(c, vec3(2.2));
}

vec3 linearToSrgb(vec3 c) {
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

vec3 applyAdjustments(vec3 color) {
  color *= pow(2.0, u_exposure);
  float contrast = 1.0 + u_contrast / 100.0;
  color = (color - 0.5) * contrast + 0.5;
  color.r += u_temperature / 400.0;
  color.b -= u_temperature / 400.0;
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float sat = 1.0 + u_saturation / 100.0;
  color = mix(vec3(l), color, sat);
  return clamp(color, 0.0, 1.0);
}

vec3 rgbToLab(vec3 rgb) {
  vec3 linear = srgbToLinear(rgb);
  float r = linear.r, g = linear.g, b = linear.b;
  float x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  float y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  float z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  vec3 xyz = vec3(x, y, z);
  xyz = mix(xyz / 0.008856, pow(xyz, vec3(1.0/3.0)), step(0.008856, xyz));
  return vec3(116.0 * xyz.y - 16.0, 500.0 * (xyz.x - xyz.y), 200.0 * (xyz.y - xyz.z));
}

vec3 labToRgb(vec3 lab) {
  float l = lab.x, a = lab.y, b = lab.z;
  float fy = (l + 16.0) / 116.0;
  float fx = a / 500.0 + fy;
  float fz = fy - b / 200.0;
  vec3 fxyz = vec3(fx, fy, fz);
  vec3 xyz = mix((fxyz - 0.137931) / 7.787, fxyz * fxyz * fxyz, step(0.206897, fxyz));
  xyz.x *= 0.95047;
  xyz.z *= 1.08883;
  float r = xyz.x * 3.2404542 + xyz.y * -1.5371385 + xyz.z * -0.4985314;
  float g = xyz.x * -0.969266 + xyz.y * 1.8760108 + xyz.z * 0.041556;
  float bl = xyz.x * 0.0556434 + xyz.y * -0.2040259 + xyz.z * 1.0572252;
  return linearToSrgb(vec3(r, g, bl));
}

vec3 reinhardTransfer(vec3 color) {
  vec3 lab = rgbToLab(color);
  vec3 transferred = (lab - u_srcMean) * (u_refStd / max(u_srcStd, vec3(0.001))) + u_refMean;
  vec3 result = labToRgb(transferred);
  return mix(color, result, u_transferStrength);
}

vec3 sampleLut(vec3 color) {
  float size = float(textureSize(u_lut, 0).x);
  vec3 scale = (vec3(size) - 1.0) / size;
  vec3 offset = 0.5 / size;
  vec3 coord = color * scale + offset;
  return texture(u_lut, coord).rgb;
}

void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 color = src.rgb;
  vec3 adjusted = applyAdjustments(color);
  vec3 result = adjusted;

  if (u_useTransfer == 1) {
    result = reinhardTransfer(adjusted);
  } else if (u_useLut == 1) {
    vec3 lutColor = sampleLut(adjusted);
    result = mix(adjusted, lutColor, u_lutStrength);
  }

  outColor = vec4(clamp(result, 0.0, 1.0), src.a);
}`;

class LutRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private imageTex: WebGLTexture | null = null;
  private lutTex: WebGLTexture | null = null;
  private imageSize = { w: 0, h: 0 };
  private lutSize = 0;

  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL2 不可用，无法应用 LUT 调色');
    this.gl = gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERT_SRC);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram();
    if (!program || !vs || !fs) throw new Error('着色器创建失败');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`着色器链接失败：${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    const names = [
      'u_image',
      'u_lut',
      'u_lutStrength',
      'u_exposure',
      'u_contrast',
      'u_temperature',
      'u_saturation',
      'u_useLut',
      'u_useTransfer',
      'u_srcMean',
      'u_srcStd',
      'u_refMean',
      'u_refStd',
      'u_transferStrength',
    ];
    for (const n of names) {
      this.uniforms[n] = gl.getUniformLocation(program, n);
    }

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('VAO 创建失败');
    this.vao = vao;
    gl.bindVertexArray(vao);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const loc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`着色器编译失败：${gl.getShaderInfoLog(shader)}`);
    }
    return shader;
  }

  uploadImage(image: HTMLImageElement): void {
    const gl = this.gl;
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    this.imageSize = { w, h };

    if (!this.imageTex) {
      this.imageTex = gl.createTexture();
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  uploadLut(lut: Lut3D): void {
    const gl = this.gl;
    const { size, data } = lut;

    if (!this.lutTex) {
      this.lutTex = gl.createTexture();
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGB16F,
      size,
      size,
      size,
      0,
      gl.RGB,
      gl.FLOAT,
      data,
    );
    this.lutSize = size;
  }

  render(options: GradeOptions): void {
    const gl = this.gl;
    const { w, h } = this.imageSize;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTex);
    gl.uniform1i(this.uniforms.u_image, 0);

    const useLut = options.mode === 'lut' && options.lut !== null;
    const useTransfer =
      options.mode === 'transfer' && options.referenceStats && options.targetStats;

    if (useLut && options.lut) {
      if (this.lutSize !== options.lut.size) {
        this.uploadLut(options.lut);
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, this.lutTex);
      gl.uniform1i(this.uniforms.u_lut, 1);
    }

    const adj = options.adjustments;
    gl.uniform1f(this.uniforms.u_lutStrength, options.strength / 100);
    gl.uniform1f(this.uniforms.u_exposure, adj.exposure);
    gl.uniform1f(this.uniforms.u_contrast, adj.contrast);
    gl.uniform1f(this.uniforms.u_temperature, adj.temperature);
    gl.uniform1f(this.uniforms.u_saturation, adj.saturation);
    gl.uniform1i(this.uniforms.u_useLut, useLut ? 1 : 0);
    gl.uniform1i(this.uniforms.u_useTransfer, useTransfer ? 1 : 0);
    gl.uniform1f(this.uniforms.u_transferStrength, options.transferStrength / 100);

    if (useTransfer && options.targetStats && options.referenceStats) {
      gl.uniform3fv(this.uniforms.u_srcMean, options.targetStats.mean);
      gl.uniform3fv(this.uniforms.u_srcStd, options.targetStats.std);
      gl.uniform3fv(this.uniforms.u_refMean, options.referenceStats.mean);
      gl.uniform3fv(this.uniforms.u_refStd, options.referenceStats.std);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    if (this.imageTex) gl.deleteTexture(this.imageTex);
    if (this.lutTex) gl.deleteTexture(this.lutTex);
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
  }
}

let sharedRenderer: LutRenderer | null = null;
let sharedCanvas: HTMLCanvasElement | null = null;

function getRenderer(): LutRenderer {
  if (!sharedCanvas) {
    sharedCanvas = createCanvas(1, 1);
  }
  if (!sharedRenderer) {
    sharedRenderer = new LutRenderer(sharedCanvas);
  }
  return sharedRenderer;
}

/* ------------------------------------------------------------------ *
 * 主入口：调色并导出
 * ------------------------------------------------------------------ */

export async function gradeImage(
  image: HTMLImageElement,
  options: GradeOptions,
  mime: OutputMime = 'image/png',
  quality = 0.95,
): Promise<GradeResult> {
  const renderer = getRenderer();
  const canvas = sharedCanvas!;
  const w = image.naturalWidth;
  const h = image.naturalHeight;

  canvas.width = w;
  canvas.height = h;

  renderer.uploadImage(image);
  if (options.mode === 'lut' && options.lut) {
    renderer.uploadLut(options.lut);
  }

  renderer.render(options);

  const blob = await canvasToBlob(canvas, mime, quality);
  return {
    blob,
    dataUrl: URL.createObjectURL(blob),
    width: w,
    height: h,
  };
}
