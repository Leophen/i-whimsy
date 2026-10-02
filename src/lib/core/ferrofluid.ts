/**
 * 磁流体 SPH 模拟 + WebGL2 metaball 金属液面渲染，零外部依赖。
 */

export interface FerrofluidParams {
  particleCount: number;
  /** 磁场强度倍率 */
  fieldStrength: number;
  /** metaball 液面阈值 0–1 */
  surfaceThreshold: number;
  /** 表面锐度：splat 半径倍率 */
  surfaceSharpness: number;
  viscosity: number;
  smoothingRadius: number;
  maxSpeed: number;
  gravity: number;
  dt: number;
}

export interface Magnet {
  /** 相对画布宽高的归一化坐标 0–1 */
  nx: number;
  ny: number;
  strength: number;
}

export interface FerrofluidPreset {
  id: string;
  name: string;
  description: string;
  /** 相对鼠标位置的磁铁偏移（归一化） */
  magnetOffsets: Array<{ dx: number; dy: number; strength: number }>;
}

export interface FerrofluidState {
  width: number;
  height: number;
  params: FerrofluidParams;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  density: Float32Array;
  pressure: Float32Array;
  presetId: string;
  /** 指针磁铁归一化坐标 */
  pointerNx: number;
  pointerNy: number;
  audioLevel: number;
  seed: number;
}

export type FerrofluidQualityId = 'low' | 'medium' | 'high';

export const FERROFLUID_BACKGROUND = '#030308';

export const FERROFLUID_QUALITY: Record<
  FerrofluidQualityId,
  { id: FerrofluidQualityId; name: string; particleCount: number }
> = {
  low: { id: 'low', name: '流畅', particleCount: 1500 },
  medium: { id: 'medium', name: '标准', particleCount: 3500 },
  high: { id: 'high', name: '精细', particleCount: 5500 },
};

export const DEFAULT_FERROFLUID_PARAMS: FerrofluidParams = {
  particleCount: FERROFLUID_QUALITY.medium.particleCount,
  fieldStrength: 1.2,
  surfaceThreshold: 0.42,
  surfaceSharpness: 1,
  viscosity: 0.18,
  smoothingRadius: 22,
  maxSpeed: 9,
  gravity: 0.08,
  dt: 0.55,
};

export const FERROFLUID_PRESETS: FerrofluidPreset[] = [
  {
    id: 'single',
    name: '单磁铁',
    description: '经典尖刺拉丝',
    magnetOffsets: [{ dx: 0, dy: 0, strength: 1 }],
  },
  {
    id: 'dual',
    name: '双极',
    description: '左右两极拉扯',
    magnetOffsets: [
      { dx: -0.12, dy: 0, strength: 1 },
      { dx: 0.12, dy: 0, strength: 1 },
    ],
  },
  {
    id: 'ring',
    name: '环形',
    description: '六极围成磁环',
    magnetOffsets: Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return { dx: Math.cos(a) * 0.14, dy: Math.sin(a) * 0.14, strength: 0.85 };
    }),
  },
  {
    id: 'press',
    name: '压力机',
    description: '上下挤压工业感',
    magnetOffsets: [
      { dx: 0, dy: -0.16, strength: 1.1 },
      { dx: 0, dy: 0.16, strength: 1.1 },
    ],
  },
];

const REST_DENSITY = 1;
const GAS_STIFFNESS = 3.2;
const PARTICLE_MASS = 1;
const MAG_SOFTENING = 28;

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

export function getFerrofluidPreset(id: string): FerrofluidPreset {
  return FERROFLUID_PRESETS.find((p) => p.id === id) ?? FERROFLUID_PRESETS[0];
}

export function checkFerrofluidSupport(): { ok: boolean; reason?: string } {
  if (typeof document === 'undefined') return { ok: false, reason: '非浏览器环境' };
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return { ok: false, reason: '当前浏览器不支持 WebGL2' };
  return { ok: true };
}

export function createFerrofluidState(
  width: number,
  height: number,
  params: FerrofluidParams,
  presetId = 'single',
  seed = Math.floor(Math.random() * 1_000_000),
): FerrofluidState {
  const n = params.particleCount;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const density = new Float32Array(n);
  const pressure = new Float32Array(n);

  const rand = mulberry32(seed);
  const cx = width * 0.5;
  const cy = height * 0.62;
  const blobR = Math.min(width, height) * 0.22;

  for (let i = 0; i < n; i++) {
    const angle = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * blobR;
    x[i] = cx + Math.cos(angle) * r;
    y[i] = cy + Math.sin(angle) * r * 0.75;
    vx[i] = (rand() - 0.5) * 0.2;
    vy[i] = (rand() - 0.5) * 0.2;
  }

  return {
    width,
    height,
    params: { ...params },
    x,
    y,
    vx,
    vy,
    density,
    pressure,
    presetId,
    pointerNx: 0.5,
    pointerNy: 0.42,
    audioLevel: 0,
    seed,
  };
}

export function syncFerrofluidParticleCount(state: FerrofluidState, count: number): void {
  const n = state.x.length;
  if (count === n) return;

  const oldX = state.x;
  const oldY = state.y;
  const oldVx = state.vx;
  const oldVy = state.vy;

  const next = createFerrofluidState(
    state.width,
    state.height,
    { ...state.params, particleCount: count },
    state.presetId,
    state.seed,
  );

  const copy = Math.min(n, count);
  if (copy > 0) {
    next.x.set(oldX.subarray(0, copy));
    next.y.set(oldY.subarray(0, copy));
    next.vx.set(oldVx.subarray(0, copy));
    next.vy.set(oldVy.subarray(0, copy));
  }

  state.x = next.x;
  state.y = next.y;
  state.vx = next.vx;
  state.vy = next.vy;
  state.density = next.density;
  state.pressure = next.pressure;
  state.params.particleCount = count;
}

function poly6(r: number, h: number): number {
  if (r >= h) return 0;
  const t = h * h - r * r;
  return (315 / (64 * Math.PI * h ** 9)) * t * t * t;
}

function spikyGrad(r: number, h: number): number {
  if (r <= 0 || r >= h) return 0;
  const t = h - r;
  return (-45 / (Math.PI * h ** 6)) * t * t;
}

function viscosityLap(r: number, h: number): number {
  if (r >= h) return 0;
  return (45 / (Math.PI * h ** 6)) * (h - r);
}

function resolveMagnets(state: FerrofluidState): Magnet[] {
  const preset = getFerrofluidPreset(state.presetId);
  const audioBoost = 1 + state.audioLevel * 1.8;
  const base = state.params.fieldStrength * audioBoost;

  return preset.magnetOffsets.map((o) => ({
    nx: Math.max(0.04, Math.min(0.96, state.pointerNx + o.dx)),
    ny: Math.max(0.04, Math.min(0.96, state.pointerNy + o.dy)),
    strength: o.strength * base,
  }));
}

export function stepFerrofluid(state: FerrofluidState): void {
  const { width, height, params, x, y, vx, vy, density, pressure } = state;
  const n = x.length;
  const h = params.smoothingRadius;
  const h2 = h * h;
  const cell = h;
  const cols = Math.max(1, Math.ceil(width / cell));
  const rows = Math.max(1, Math.ceil(height / cell));
  const grid = new Map<number, number[]>();
  const key = (cx: number, cy: number) => cy * cols + cx;

  for (let i = 0; i < n; i++) {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(x[i] / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(y[i] / cell)));
    const k = key(cx, cy);
    const bucket = grid.get(k);
    if (bucket) bucket.push(i);
    else grid.set(k, [i]);
  }

  for (let i = 0; i < n; i++) {
    let rho = 0;
    const xi = x[i];
    const yi = y[i];
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(xi / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(yi / cell)));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ncx = cx + dx;
        const ncy = cy + dy;
        if (ncx < 0 || ncy < 0 || ncx >= cols || ncy >= rows) continue;
        const bucket = grid.get(key(ncx, ncy));
        if (!bucket) continue;
        for (const j of bucket) {
          const ddx = xi - x[j];
          const ddy = yi - y[j];
          const r2 = ddx * ddx + ddy * ddy;
          if (r2 >= h2) continue;
          rho += PARTICLE_MASS * poly6(Math.sqrt(r2), h);
        }
      }
    }
    density[i] = Math.max(rho, REST_DENSITY * 0.35);
    pressure[i] = GAS_STIFFNESS * (density[i] - REST_DENSITY);
  }

  const fx = new Float32Array(n);
  const fy = new Float32Array(n);
  const magnets = resolveMagnets(state);

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const pi = pressure[i];
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(xi / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(yi / cell)));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ncx = cx + dx;
        const ncy = cy + dy;
        if (ncx < 0 || ncy < 0 || ncx >= cols || ncy >= rows) continue;
        const bucket = grid.get(key(ncx, ncy));
        if (!bucket) continue;

        for (const j of bucket) {
          if (i === j) continue;
          const ddx = xi - x[j];
          const ddy = yi - y[j];
          const r2 = ddx * ddx + ddy * ddy;
          if (r2 >= h2 || r2 < 1e-6) continue;
          const dist = Math.sqrt(r2);
          const invR = 1 / dist;
          const nx = ddx * invR;
          const ny = ddy * invR;

          const pj = pressure[j];
          const coeff = -PARTICLE_MASS * ((pi + pj) / (2 * density[j])) * spikyGrad(dist, h);
          fx[i] += coeff * nx;
          fy[i] += coeff * ny;

          const visc = params.viscosity * PARTICLE_MASS * viscosityLap(dist, h) / density[j];
          fx[i] += visc * (vx[j] - vx[i]);
          fy[i] += visc * (vy[j] - vy[i]);
        }
      }
    }

    for (const m of magnets) {
      const mx = m.nx * width;
      const my = m.ny * height;
      const ddx = mx - xi;
      const ddy = my - yi;
      const r2 = ddx * ddx + ddy * ddy + MAG_SOFTENING * MAG_SOFTENING;
      const invR = 1 / Math.sqrt(r2);
      const force = m.strength * 4200 * invR * invR;
      fx[i] += ddx * invR * force;
      fy[i] += ddy * invR * force;
    }

    fy[i] += params.gravity;
  }

  const margin = h * 0.8;
  const damp = 0.35;
  const maxSpd = params.maxSpeed;
  const dt = params.dt;

  for (let i = 0; i < n; i++) {
    vx[i] += fx[i] * dt;
    vy[i] += fy[i] * dt;

    const spd = Math.hypot(vx[i], vy[i]);
    if (spd > maxSpd) {
      const s = maxSpd / spd;
      vx[i] *= s;
      vy[i] *= s;
    }

    x[i] += vx[i] * dt;
    y[i] += vy[i] * dt;

    if (x[i] < margin) {
      x[i] = margin;
      vx[i] *= -damp;
    } else if (x[i] > width - margin) {
      x[i] = width - margin;
      vx[i] *= -damp;
    }
    if (y[i] < margin) {
      y[i] = margin;
      vy[i] *= -damp;
    } else if (y[i] > height - margin) {
      y[i] = height - margin;
      vy[i] *= -damp;
    }

    vx[i] *= 0.985;
    vy[i] *= 0.985;
  }
}

/* ------------------------------------------------------------------ *
 * WebGL2 metaball renderer
 * ------------------------------------------------------------------ */

const VERT_SRC = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const SPLAT_VERT = `#version 300 es
in vec2 a_particle;
uniform vec2 u_resolution;
uniform float u_pointRadius;
void main() {
  vec2 ndc = vec2(
    (a_particle.x / u_resolution.x) * 2.0 - 1.0,
    1.0 - (a_particle.y / u_resolution.y) * 2.0
  );
  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = u_pointRadius;
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c);
  float d = exp(-r2 * 14.0);
  outColor = vec4(d, 0.0, 0.0, 1.0);
}`;

const SHADE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_density;
uniform vec2 u_texel;
uniform float u_threshold;
uniform vec3 u_bg;
in vec2 v_uv;
out vec4 outColor;

void main() {
  float d = texture(u_density, v_uv).r;
  float edge = u_threshold * 0.55;
  if (d < edge * 0.35) {
    outColor = vec4(u_bg, 1.0);
    return;
  }

  float dx = texture(u_density, v_uv + vec2(u_texel.x, 0.0)).r
           - texture(u_density, v_uv - vec2(u_texel.x, 0.0)).r;
  float dy = texture(u_density, v_uv + vec2(0.0, u_texel.y)).r
           - texture(u_density, v_uv - vec2(0.0, u_texel.y)).r;
  vec3 normal = normalize(vec3(-dx * 2.8, -dy * 2.8, 0.06 + d * 0.08));

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 lightDir = normalize(vec3(0.25, -0.55, 0.82));
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), 72.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);

  float mask = smoothstep(edge * 0.65, edge * 1.35, d);
  vec3 base = vec3(0.015, 0.015, 0.022);
  vec3 color = base + diff * vec3(0.12, 0.12, 0.14) + spec * vec3(0.95, 0.96, 1.0);
  color += fresnel * vec3(0.18, 0.2, 0.28) * mask;
  color = mix(u_bg, color, mask);
  outColor = vec4(color, 1.0);
}`;

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

function createProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  return linkProgram(gl, vs, fs);
}

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16) / 255,
    Number.parseInt(h.slice(2, 4), 16) / 255,
    Number.parseInt(h.slice(4, 6), 16) / 255,
  ];
};

export class FerrofluidRenderer {
  private gl: WebGL2RenderingContext;
  private quadVao: WebGLVertexArrayObject;
  private splatVao: WebGLVertexArrayObject;
  private particleBuffer: WebGLBuffer;
  private densityTex: WebGLTexture;
  private densityFbo: WebGLFramebuffer;
  private splatProgram: WebGLProgram;
  private shadeProgram: WebGLProgram;
  private splatUniforms: Record<string, WebGLUniformLocation | null>;
  private shadeUniforms: Record<string, WebGLUniformLocation | null>;
  private renderW = 0;
  private renderH = 0;
  mode: 'webgl' | 'canvas' = 'webgl';

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
    });
    if (!gl) throw new Error('WebGL2 不可用');
    this.gl = gl;
    this.mode = 'webgl';

    this.splatProgram = createProgram(gl, SPLAT_VERT, SPLAT_FRAG);
    this.shadeProgram = createProgram(gl, VERT_SRC, SHADE_FRAG);

    this.splatUniforms = {
      u_resolution: gl.getUniformLocation(this.splatProgram, 'u_resolution'),
      u_pointRadius: gl.getUniformLocation(this.splatProgram, 'u_pointRadius'),
    };
    this.shadeUniforms = {
      u_density: gl.getUniformLocation(this.shadeProgram, 'u_density'),
      u_texel: gl.getUniformLocation(this.shadeProgram, 'u_texel'),
      u_threshold: gl.getUniformLocation(this.shadeProgram, 'u_threshold'),
      u_bg: gl.getUniformLocation(this.shadeProgram, 'u_bg'),
    };

    const quad = gl.createBuffer();
    if (!quad) throw new Error('缓冲创建失败');
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    this.quadVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.quadVao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.particleBuffer = gl.createBuffer()!;
    this.splatVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.splatVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.densityTex = gl.createTexture()!;
    this.densityFbo = gl.createFramebuffer()!;
    gl.bindVertexArray(null);
  }

  resize(width: number, height: number): void {
    const gl = this.gl;
    this.renderW = width;
    this.renderH = height;
    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.densityTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(state: FerrofluidState): void {
    const gl = this.gl;
    const { width, height, params, x, y } = state;
    if (width !== this.renderW || height !== this.renderH) this.resize(width, height);

    const n = x.length;
    const positions = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      positions[i * 2] = x[i];
      positions[i * 2 + 1] = y[i];
    }

    const pointRadius = params.smoothingRadius * 2.4 * params.surfaceSharpness;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.densityFbo);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.splatProgram);
    gl.uniform2f(this.splatUniforms.u_resolution, width, height);
    gl.uniform1f(this.splatUniforms.u_pointRadius, pointRadius);

    gl.bindVertexArray(this.splatVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.shadeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.densityTex);
    gl.uniform1i(this.shadeUniforms.u_density, 0);
    gl.uniform2f(this.shadeUniforms.u_texel, 1 / width, 1 / height);
    gl.uniform1f(this.shadeUniforms.u_threshold, params.surfaceThreshold);
    const bg = parseHex(FERROFLUID_BACKGROUND);
    gl.uniform3f(this.shadeUniforms.u_bg, bg[0], bg[1], bg[2]);

    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.splatProgram);
    gl.deleteProgram(this.shadeProgram);
    gl.deleteBuffer(this.particleBuffer);
    gl.deleteTexture(this.densityTex);
    gl.deleteFramebuffer(this.densityFbo);
    gl.deleteVertexArray(this.quadVao);
    gl.deleteVertexArray(this.splatVao);
  }
}

/** Canvas 2D 回退渲染 —— WebGL2 不可用时仍能看效果。 */
export function renderFerrofluidCanvas2D(
  ctx: CanvasRenderingContext2D,
  state: FerrofluidState,
): void {
  const { width, height, params, x, y } = state;
  const n = x.length;
  const radius = params.smoothingRadius * params.surfaceSharpness * 0.95;

  ctx.fillStyle = FERROFLUID_BACKGROUND;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const px = x[i];
    const py = y[i];
    const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0, 'rgba(180,190,220,0.55)');
    g.addColorStop(0.45, 'rgba(60,65,90,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';

  const magnets = resolveMagnets(state);
  for (const m of magnets) {
    const mx = m.nx * width;
    const my = m.ny * height;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 36);
    g.addColorStop(0, 'rgba(120,140,200,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, 36, 0, Math.PI * 2);
    ctx.fill();
  }
}
