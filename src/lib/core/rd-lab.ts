/**
 * Gray-Scott 反应扩散 —— WebGL2 ping-pong 浮点纹理，零外部依赖。
 */

/* ------------------------------------------------------------------ *
 * Types & constants
 * ------------------------------------------------------------------ */

export interface RdLabParams {
  feed: number;
  kill: number;
  diffusionA: number;
  diffusionB: number;
  /** 模拟时间步长 */
  dt: number;
  stepsPerFrame: number;
}

export const DEFAULT_RD_PARAMS: RdLabParams = {
  feed: 0.0545,
  kill: 0.062,
  diffusionA: 1.0,
  diffusionB: 0.5,
  dt: 1.0,
  stepsPerFrame: 10,
};

export interface RdLabPalette {
  id: string;
  name: string;
  background: string;
  /** B 值 0–1 对应的颜色梯度 */
  colors: string[];
}

export const RD_PALETTES: RdLabPalette[] = [
  {
    id: 'deep-sea',
    name: '深蓝',
    background: '#020818',
    colors: ['#020818', '#0a2a4a', '#1a6b8a', '#4ecdc4', '#f7fff7'],
  },
  {
    id: 'volcano',
    name: '火山',
    background: '#0a0505',
    colors: ['#0a0505', '#4a1010', '#c0392b', '#e67e22', '#f9e79f'],
  },
  {
    id: 'neon',
    name: '荧光',
    background: '#050510',
    colors: ['#050510', '#1a0a3a', '#7b2ff7', '#00f5d4', '#ffff00'],
  },
  {
    id: 'mono',
    name: '黑白',
    background: '#0a0a0a',
    colors: ['#0a0a0a', '#2a2a2a', '#666666', '#aaaaaa', '#ffffff'],
  },
  {
    id: 'coral',
    name: '珊瑚粉',
    background: '#120810',
    colors: ['#120810', '#3d1a30', '#c44569', '#f8b500', '#fce4ec'],
  },
  {
    id: 'forest',
    name: '苔藓',
    background: '#060a06',
    colors: ['#060a06', '#1a3a1a', '#2d6a4f', '#95d5b2', '#d8f3dc'],
  },
];

export interface RdLabPreset {
  id: string;
  name: string;
  description: string;
  feed: number;
  kill: number;
  /** 缩略图用渐变色 */
  swatch: string[];
}

export const RD_PRESETS: RdLabPreset[] = [
  {
    id: 'coral',
    name: '珊瑚生长',
    description: '分支状珊瑚纹理，经典 Gray-Scott 形态',
    feed: 0.0545,
    kill: 0.062,
    swatch: ['#0a2a4a', '#4ecdc4', '#f7fff7'],
  },
  {
    id: 'fingerprint',
    name: '指纹',
    description: '环形闭合曲线，类似指纹纹路',
    feed: 0.055,
    kill: 0.062,
    swatch: ['#1a1a2e', '#e94560', '#f5f5f5'],
  },
  {
    id: 'zebra',
    name: '斑马纹',
    description: '平行条纹，图灵斑纹的经典形态',
    feed: 0.04,
    kill: 0.06,
    swatch: ['#111', '#eee', '#111'],
  },
  {
    id: 'mitosis',
    name: '细胞分裂',
    description: '圆形斑点不断分裂增殖',
    feed: 0.0367,
    kill: 0.0649,
    swatch: ['#0d1b2a', '#778da9', '#e0e1dd'],
  },
  {
    id: 'maze',
    name: '迷宫',
    description: '曲折管状通道，类似迷宫或神经网络',
    feed: 0.029,
    kill: 0.057,
    swatch: ['#1b263b', '#415a77', '#e0e1dd'],
  },
  {
    id: 'spots',
    name: '斑点',
    description: '均匀分布的圆点阵列',
    feed: 0.035,
    kill: 0.065,
    swatch: ['#2d132c', '#801336', '#ee4540'],
  },
  {
    id: 'worms',
    name: '蠕虫',
    description: '蜿蜒条带，像蠕虫在爬行',
    feed: 0.078,
    kill: 0.061,
    swatch: ['#0f0f0f', '#4a7c59', '#a8dadc'],
  },
  {
    id: 'solitons',
    name: '孤波',
    description: '稳定的局部脉冲，会移动但不会消散',
    feed: 0.03,
    kill: 0.062,
    swatch: ['#03045e', '#0077b6', '#90e0ef'],
  },
  {
    id: 'ripple',
    name: '涟漪',
    description: '同心波纹从种子向外扩散',
    feed: 0.026,
    kill: 0.055,
    swatch: ['#0a0a23', '#3d5a80', '#98c1d9'],
  },
  {
    id: 'bubbles',
    name: '气泡',
    description: '不规则气泡状空腔',
    feed: 0.012,
    kill: 0.05,
    swatch: ['#1a1a2e', '#16213e', '#e94560'],
  },
];

/** 参数地图上标注的有趣区域（坐标为 kill/feed 归一化 0–1）。 */
export interface ParamMapRegion {
  id: string;
  name: string;
  feed: number;
  kill: number;
  /** kill 轴归一化位置 */
  nx: number;
  /** feed 轴归一化位置（0=底部高 feed，1=顶部低 feed） */
  ny: number;
}

export const KILL_MIN = 0.045;
export const KILL_MAX = 0.07;
export const FEED_MIN = 0.02;
export const FEED_MAX = 0.08;

export const PARAM_MAP_REGIONS: ParamMapRegion[] = RD_PRESETS.map((p) => ({
  id: p.id,
  name: p.name,
  feed: p.feed,
  kill: p.kill,
  nx: (p.kill - KILL_MIN) / (KILL_MAX - KILL_MIN),
  ny: 1 - (p.feed - FEED_MIN) / (FEED_MAX - FEED_MIN),
}));

export const QUALITY_LEVELS = {
  low: { resolution: 256, label: '流畅' },
  medium: { resolution: 512, label: '平衡' },
  high: { resolution: 1024, label: '精细' },
} as const;

export type RdQualityId = keyof typeof QUALITY_LEVELS;

export function feedKillFromMapPoint(nx: number, ny: number): { feed: number; kill: number } {
  const kill = KILL_MIN + nx * (KILL_MAX - KILL_MIN);
  const feed = FEED_MAX - ny * (FEED_MAX - FEED_MIN);
  return { feed, kill };
}

export function mapPointFromFeedKill(feed: number, kill: number): { nx: number; ny: number } {
  return {
    nx: (kill - KILL_MIN) / (KILL_MAX - KILL_MIN),
    ny: 1 - (feed - FEED_MIN) / (FEED_MAX - FEED_MIN),
  };
}

export function encodeRdLabHash(
  params: Pick<RdLabParams, 'feed' | 'kill' | 'stepsPerFrame'>,
  paletteId: string,
  quality: RdQualityId,
): string {
  return `#${params.feed.toFixed(4)},${params.kill.toFixed(4)},${paletteId},${quality},${params.stepsPerFrame}`;
}

export function decodeRdLabHash(hash: string): {
  params: Partial<RdLabParams>;
  paletteId?: string;
  quality?: RdQualityId;
} {
  const raw = hash.replace(/^#/, '');
  if (!raw) return { params: {} };
  const parts = raw.split(',');
  if (parts.length < 3) return { params: {} };
  const result: {
    params: Partial<RdLabParams>;
    paletteId?: string;
    quality?: RdQualityId;
  } = {
    params: {
      feed: Number(parts[0]),
      kill: Number(parts[1]),
    },
    paletteId: parts[2],
  };
  if (parts[3] && parts[3] in QUALITY_LEVELS) {
    result.quality = parts[3] as RdQualityId;
  }
  if (parts[4]) {
    result.params.stepsPerFrame = Number(parts[4]);
  }
  return result;
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * WebGL2 support check
 * ------------------------------------------------------------------ */

export function checkRdLabSupport(): { ok: boolean; reason?: string } {
  if (typeof document === 'undefined') return { ok: false, reason: '非浏览器环境' };
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return { ok: false, reason: '当前浏览器不支持 WebGL2' };

  const ext = gl.getExtension('EXT_color_buffer_float');
  if (!ext) {
    return { ok: false, reason: '缺少 EXT_color_buffer_float 扩展，无法使用浮点纹理模拟' };
  }

  const tex = gl.createTexture();
  if (!tex) return { ok: false, reason: '纹理创建失败' };
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, 4, 4, 0, gl.RG, gl.FLOAT, null);

  const fb = gl.createFramebuffer();
  if (!fb) return { ok: false, reason: '帧缓冲创建失败' };
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteTexture(tex);
  gl.deleteFramebuffer(fb);

  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    return { ok: false, reason: '浮点纹理帧缓冲不可用，GPU 可能不支持此精度' };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Shaders
 * ------------------------------------------------------------------ */

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec2 u_texel;
uniform float u_feed;
uniform float u_kill;
uniform float u_dA;
uniform float u_dB;
uniform float u_dt;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 c = texture(u_state, v_uv);
  float A = c.r;
  float B = c.g;

  float nA = texture(u_state, v_uv + vec2(0.0, u_texel.y)).r;
  float sA = texture(u_state, v_uv - vec2(0.0, u_texel.y)).r;
  float eA = texture(u_state, v_uv + vec2(u_texel.x, 0.0)).r;
  float wA = texture(u_state, v_uv - vec2(u_texel.x, 0.0)).r;
  float lapA = nA + sA + eA + wA - 4.0 * A;

  float nB = texture(u_state, v_uv + vec2(0.0, u_texel.y)).g;
  float sB = texture(u_state, v_uv - vec2(0.0, u_texel.y)).g;
  float eB = texture(u_state, v_uv + vec2(u_texel.x, 0.0)).g;
  float wB = texture(u_state, v_uv - vec2(u_texel.x, 0.0)).g;
  float lapB = nB + sB + eB + wB - 4.0 * B;

  float reaction = A * B * B;
  float dA = -reaction + u_feed * (1.0 - A) + u_dA * lapA;
  float dB = reaction - (u_kill + u_feed) * B + u_dB * lapB;

  float newA = clamp(A + dA * u_dt, 0.0, 1.0);
  float newB = clamp(B + dB * u_dt, 0.0, 1.0);
  outColor = vec4(newA, newB, 0.0, 1.0);
}`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
in vec2 v_uv;
out vec4 outColor;

vec3 grad5(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 0.25) return mix(u_c0, u_c1, t * 4.0);
  if (t < 0.5) return mix(u_c1, u_c2, (t - 0.25) * 4.0);
  if (t < 0.75) return mix(u_c2, u_c3, (t - 0.5) * 4.0);
  return mix(u_c3, u_c4, (t - 0.75) * 4.0);
}

void main() {
  float B = texture(u_state, v_uv).g;
  outColor = vec4(grad5(B), 1.0);
}`;

const BRUSH_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec2 u_point;
uniform float u_radius;
uniform float u_strength;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 state = texture(u_state, v_uv);
  float dist = distance(v_uv, u_point);
  if (dist < u_radius) {
    float t = 1.0 - dist / u_radius;
    float add = t * t * u_strength;
    state.g = clamp(state.g + add, 0.0, 1.0);
    state.r = clamp(state.r - add * 0.3, 0.0, 1.0);
  }
  outColor = state;
}`;

const INIT_FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  outColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16) / 255,
    Number.parseInt(h.slice(2, 4), 16) / 255,
    Number.parseInt(h.slice(4, 6), 16) / 255,
  ];
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('着色器创建失败');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? '未知错误';
    gl.deleteShader(shader);
    throw new Error(`着色器编译失败：${log}`);
  }
  return shader;
}

function linkProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('程序创建失败');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? '未知错误';
    throw new Error(`着色器链接失败：${log}`);
  }
  return program;
}

function createProgram(gl: WebGL2RenderingContext, fragSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  return linkProgram(gl, vs, fs);
}

function createFloatTexture(gl: WebGL2RenderingContext, w: number, h: number): WebGLTexture {
  const tex = gl.createTexture();
  if (!tex) throw new Error('纹理创建失败');
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, w, h, 0, gl.RG, gl.FLOAT, null);
  return tex;
}

function createFbo(gl: WebGL2RenderingContext, tex: WebGLTexture): WebGLFramebuffer {
  const fb = gl.createFramebuffer();
  if (!fb) throw new Error('帧缓冲创建失败');
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('浮点纹理帧缓冲不完整');
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fb;
}

/* ------------------------------------------------------------------ *
 * Simulator
 * ------------------------------------------------------------------ */

export class RdLabSimulator {
  private gl: WebGL2RenderingContext;
  private simW = 512;
  private simH = 512;
  private textures: [WebGLTexture, WebGLTexture];
  private fbos: [WebGLFramebuffer, WebGLFramebuffer];
  private ping = 0;
  private vao: WebGLVertexArrayObject;

  private simProgram: WebGLProgram;
  private displayProgram: WebGLProgram;
  private brushProgram: WebGLProgram;
  private initProgram: WebGLProgram;

  private simUniforms: Record<string, WebGLUniformLocation | null>;
  private displayUniforms: Record<string, WebGLUniformLocation | null>;
  private brushUniforms: Record<string, WebGLUniformLocation | null>;

  iteration = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) throw new Error('WebGL2 不可用');
    this.gl = gl;

    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');

    this.simProgram = createProgram(gl, SIM_FRAG);
    this.displayProgram = createProgram(gl, DISPLAY_FRAG);
    this.brushProgram = createProgram(gl, BRUSH_FRAG);
    this.initProgram = createProgram(gl, INIT_FRAG);

    this.simUniforms = {
      u_state: gl.getUniformLocation(this.simProgram, 'u_state'),
      u_texel: gl.getUniformLocation(this.simProgram, 'u_texel'),
      u_feed: gl.getUniformLocation(this.simProgram, 'u_feed'),
      u_kill: gl.getUniformLocation(this.simProgram, 'u_kill'),
      u_dA: gl.getUniformLocation(this.simProgram, 'u_dA'),
      u_dB: gl.getUniformLocation(this.simProgram, 'u_dB'),
      u_dt: gl.getUniformLocation(this.simProgram, 'u_dt'),
    };
    this.displayUniforms = {
      u_state: gl.getUniformLocation(this.displayProgram, 'u_state'),
      u_c0: gl.getUniformLocation(this.displayProgram, 'u_c0'),
      u_c1: gl.getUniformLocation(this.displayProgram, 'u_c1'),
      u_c2: gl.getUniformLocation(this.displayProgram, 'u_c2'),
      u_c3: gl.getUniformLocation(this.displayProgram, 'u_c3'),
      u_c4: gl.getUniformLocation(this.displayProgram, 'u_c4'),
    };
    this.brushUniforms = {
      u_state: gl.getUniformLocation(this.brushProgram, 'u_state'),
      u_point: gl.getUniformLocation(this.brushProgram, 'u_point'),
      u_radius: gl.getUniformLocation(this.brushProgram, 'u_radius'),
      u_strength: gl.getUniformLocation(this.brushProgram, 'u_strength'),
    };

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('VAO 创建失败');
    this.vao = vao;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const prog of [this.simProgram, this.displayProgram, this.brushProgram, this.initProgram]) {
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);

    const t0 = createFloatTexture(gl, 4, 4);
    const t1 = createFloatTexture(gl, 4, 4);
    this.textures = [t0, t1];
    this.fbos = [createFbo(gl, t0), createFbo(gl, t1)];

    this.resizeSim(512, 512);
  }

  private blit(
    program: WebGLProgram,
    targetFbo: WebGLFramebuffer | null,
    viewportW: number,
    viewportH: number,
    bindTex: WebGLTexture | null,
    texUnit: number,
    setUniforms?: () => void,
  ): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo);
    gl.viewport(0, 0, viewportW, viewportH);
    gl.useProgram(program);
    gl.bindVertexArray(this.vao);

    if (bindTex) {
      gl.activeTexture(gl.TEXTURE0 + texUnit);
      gl.bindTexture(gl.TEXTURE_2D, bindTex);
      const loc = gl.getUniformLocation(program, 'u_state');
      if (loc) gl.uniform1i(loc, texUnit);
    }

    setUniforms?.();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resizeSim(maxRes: number, aspect: number): void {
    const gl = this.gl;
    let w: number;
    let h: number;
    if (aspect >= 1) {
      w = maxRes;
      h = Math.max(64, Math.round(maxRes / aspect));
    } else {
      h = maxRes;
      w = Math.max(64, Math.round(maxRes * aspect));
    }

    if (w === this.simW && h === this.simH) return;

    this.simW = w;
    this.simH = h;

    for (let i = 0; i < 2; i += 1) {
      gl.deleteTexture(this.textures[i]);
      gl.deleteFramebuffer(this.fbos[i]);
    }

    const t0 = createFloatTexture(gl, w, h);
    const t1 = createFloatTexture(gl, w, h);
    this.textures = [t0, t1];
    this.fbos = [createFbo(gl, t0), createFbo(gl, t1)];
    this.ping = 0;
    this.iteration = 0;
    this.resetField();
  }

  resetField(): void {
    this.blit(this.initProgram, this.fbos[0], this.simW, this.simH, null, 0);
    this.blit(this.initProgram, this.fbos[1], this.simW, this.simH, null, 0);
    this.ping = 0;
    this.iteration = 0;
  }

  paint(nx: number, ny: number, radius: number, strength = 1.0): void {
    const gl = this.gl;
    const read = this.textures[this.ping];
    const write = 1 - this.ping;

    this.blit(this.brushProgram, this.fbos[write], this.simW, this.simH, read, 0, () => {
      gl.uniform2f(this.brushUniforms.u_point, nx, ny);
      gl.uniform1f(this.brushUniforms.u_radius, radius);
      gl.uniform1f(this.brushUniforms.u_strength, strength);
    });
    this.ping = write;
  }

  randomSeed(rand: () => number, count = 24, radius = 0.025): void {
    this.resetField();
    for (let i = 0; i < count; i += 1) {
      this.paint(rand(), rand(), radius * (0.6 + rand() * 0.8), 0.8 + rand() * 0.2);
    }
  }

  step(params: RdLabParams, count = 1): void {
    const gl = this.gl;
    const texelX = 1 / this.simW;
    const texelY = 1 / this.simH;

    for (let i = 0; i < count; i += 1) {
      const read = this.textures[this.ping];
      const write = 1 - this.ping;

      this.blit(this.simProgram, this.fbos[write], this.simW, this.simH, read, 0, () => {
        gl.uniform2f(this.simUniforms.u_texel, texelX, texelY);
        gl.uniform1f(this.simUniforms.u_feed, params.feed);
        gl.uniform1f(this.simUniforms.u_kill, params.kill);
        gl.uniform1f(this.simUniforms.u_dA, params.diffusionA);
        gl.uniform1f(this.simUniforms.u_dB, params.diffusionB);
        gl.uniform1f(this.simUniforms.u_dt, params.dt);
      });
      this.ping = write;
      this.iteration += 1;
    }
  }

  display(palette: RdLabPalette, displayW: number, displayH: number): void {
    const gl = this.gl;
    const colors = palette.colors;
    const c = colors.map(parseHex);
    while (c.length < 5) c.push(c[c.length - 1] ?? [0, 0, 0]);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, displayW, displayH);
    gl.useProgram(this.displayProgram);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.ping]);
    gl.uniform1i(this.displayUniforms.u_state, 0);
    gl.uniform3fv(this.displayUniforms.u_c0, c[0]);
    gl.uniform3fv(this.displayUniforms.u_c1, c[1]);
    gl.uniform3fv(this.displayUniforms.u_c2, c[2]);
    gl.uniform3fv(this.displayUniforms.u_c3, c[3]);
    gl.uniform3fv(this.displayUniforms.u_c4, c[4]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  getSimSize(): { w: number; h: number } {
    return { w: this.simW, h: this.simH };
  }

  dispose(): void {
    const gl = this.gl;
    for (let i = 0; i < 2; i += 1) {
      gl.deleteTexture(this.textures[i]);
      gl.deleteFramebuffer(this.fbos[i]);
    }
    gl.deleteProgram(this.simProgram);
    gl.deleteProgram(this.displayProgram);
    gl.deleteProgram(this.brushProgram);
    gl.deleteProgram(this.initProgram);
    gl.deleteVertexArray(this.vao);
  }
}
