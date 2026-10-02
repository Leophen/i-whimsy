/**
 * 黏菌（Physarum polycephalum）agent 模型 —— 纯函数，零依赖。
 * 个体感知化学痕迹、转向、前进并沉积；痕迹场扩散与衰减后自发形成运输网络。
 */

export interface PhysarumParams {
  agentCount: number;
  /** 左右传感器相对朝向的偏角（弧度） */
  sensorAngle: number;
  /** 传感器前方采样距离（网格像素） */
  sensorDistance: number;
  /** 转向角（弧度） */
  rotationAngle: number;
  /** 每步移动距离（网格像素） */
  moveSpeed: number;
  /** 每步沉积量 */
  depositAmount: number;
  /** 每帧衰减系数 0–1 */
  decay: number;
  /** 扩散混合比 0–1 */
  diffusion: number;
  /** 食物点每帧沉积强度 */
  foodStrength: number;
}

export const DEFAULT_PHYSARUM_PARAMS: PhysarumParams = {
  agentCount: 50_000,
  sensorAngle: 0.35,
  sensorDistance: 7,
  rotationAngle: 0.4,
  moveSpeed: 1,
  depositAmount: 1,
  decay: 0.96,
  diffusion: 0.45,
  foodStrength: 3.5,
};

export interface FoodPoint {
  /** 归一化坐标 0–1 */
  x: number;
  y: number;
  strength?: number;
}

export interface PhysarumPalette {
  id: string;
  name: string;
  background: string;
  colors: string[];
  /** 痕迹值 → 颜色的增益 */
  gain: number;
}

export const PHYSARUM_PALETTES: PhysarumPalette[] = [
  {
    id: 'slime',
    name: '黏菌',
    background: '#060a08',
    colors: ['#0d1a12', '#1a4d2e', '#4ade80', '#bbf7d0', '#fef9c3'],
    gain: 0.12,
  },
  {
    id: 'tokyo',
    name: '东京夜',
    background: '#050508',
    colors: ['#0a0a14', '#1e1b4b', '#6366f1', '#a5b4fc', '#fde68a'],
    gain: 0.14,
  },
  {
    id: 'ember',
    name: '余烬',
    background: '#0a0505',
    colors: ['#1a0808', '#7f1d1d', '#ea580c', '#fbbf24', '#fef3c7'],
    gain: 0.13,
  },
  {
    id: 'ocean',
    name: '深海',
    background: '#020810',
    colors: ['#041018', '#0c4a6e', '#0891b2', '#67e8f9', '#ecfeff'],
    gain: 0.12,
  },
];

export interface PhysarumPreset {
  id: string;
  name: string;
  description: string;
  foods: FoodPoint[];
}

/** 2009 年 Tero 实验：黏菌重连东京周边铁路网的经典食物点布局（归一化）。 */
export const TOKYO_FOOD_POINTS: FoodPoint[] = [
  { x: 0.5, y: 0.42, strength: 2.5 },
  { x: 0.28, y: 0.36, strength: 2 },
  { x: 0.72, y: 0.34, strength: 2 },
  { x: 0.36, y: 0.58, strength: 2 },
  { x: 0.64, y: 0.62, strength: 2 },
  { x: 0.46, y: 0.22, strength: 2 },
  { x: 0.54, y: 0.76, strength: 2 },
];

export const PHYSARUM_PRESETS: PhysarumPreset[] = [
  {
    id: 'tokyo',
    name: '东京铁路网',
    description:
      '2009 年科学家在东京地形上摆放燕麦粒，黏菌 26 小时内长出了与真实铁路网高度相似的网络。此处用相同布局复现。',
    foods: TOKYO_FOOD_POINTS,
  },
  {
    id: 'random',
    name: '随机撒点',
    description: '在画布内随机放置 6 个食物点，观察网络如何涌现。',
    foods: [],
  },
  {
    id: 'ring',
    name: '环形分布',
    description: '食物均匀分布在圆周上，网络会趋向连接成环。',
    foods: [],
  },
];

export interface PhysarumState {
  width: number;
  height: number;
  trail: Float32Array;
  deposits: Float32Array;
  blur: Float32Array;
  /** [x, y, angle, ...] */
  agents: Float32Array;
  iteration: number;
}

const TAU = Math.PI * 2;

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpColor = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** mulberry32 —— 可复现伪随机。 */
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

export function generateRandomFoods(
  count: number,
  seed: number,
  margin = 0.12,
): FoodPoint[] {
  const rand = mulberry32(seed);
  const foods: FoodPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    foods.push({
      x: margin + rand() * (1 - margin * 2),
      y: margin + rand() * (1 - margin * 2),
      strength: 2,
    });
  }
  return foods;
}

export function generateRingFoods(
  count: number,
  radius = 0.32,
  cx = 0.5,
  cy = 0.5,
): FoodPoint[] {
  const foods: FoodPoint[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU;
    foods.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      strength: 2,
    });
  }
  return foods;
}

export function foodsForPreset(presetId: string, seed = 42_857): FoodPoint[] {
  if (presetId === 'ring') return generateRingFoods(8);
  if (presetId === 'random') return generateRandomFoods(6, seed);
  const preset = PHYSARUM_PRESETS.find((p) => p.id === presetId);
  return preset?.foods.length ? preset.foods.map((f) => ({ ...f })) : TOKYO_FOOD_POINTS;
}

function initAgents(agents: Float32Array, width: number, height: number, rand: () => number) {
  const count = agents.length / 3;
  for (let i = 0; i < count; i += 1) {
    const o = i * 3;
    agents[o] = rand() * width;
    agents[o + 1] = rand() * height;
    agents[o + 2] = rand() * TAU;
  }
}

export function createPhysarumState(
  width: number,
  height: number,
  params: PhysarumParams,
  seed = 42_857,
): PhysarumState {
  const w = Math.max(64, Math.round(width));
  const h = Math.max(64, Math.round(height));
  const size = w * h;
  const rand = mulberry32(seed);
  const agents = new Float32Array(params.agentCount * 3);
  initAgents(agents, w, h, rand);
  return {
    width: w,
    height: h,
    trail: new Float32Array(size),
    deposits: new Float32Array(size),
    blur: new Float32Array(size),
    agents,
    iteration: 0,
  };
}

export function resizeAgentCount(state: PhysarumState, agentCount: number, seed = 42_857) {
  const rand = mulberry32(seed + state.iteration);
  state.agents = new Float32Array(agentCount * 3);
  initAgents(state.agents, state.width, state.height, rand);
}

export function clearPhysarumTrail(state: PhysarumState) {
  state.trail.fill(0);
  state.deposits.fill(0);
  state.blur.fill(0);
  state.iteration = 0;
}

function wrap(v: number, max: number): number {
  let n = v % max;
  if (n < 0) n += max;
  return n;
}

function sampleTrail(trail: Float32Array, w: number, h: number, x: number, y: number): number {
  const fx = wrap(x, w);
  const fy = wrap(y, h);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = (x0 + 1) % w;
  const y1 = (y0 + 1) % h;
  const tx = fx - x0;
  const ty = fy - y0;
  const i00 = y0 * w + x0;
  const i10 = y0 * w + x1;
  const i01 = y1 * w + x0;
  const i11 = y1 * w + x1;
  const top = lerp(trail[i00], trail[i10], tx);
  const bottom = lerp(trail[i01], trail[i11], tx);
  return lerp(top, bottom, ty);
}

function depositAt(
  deposits: Float32Array,
  w: number,
  h: number,
  x: number,
  y: number,
  amount: number,
) {
  const ix = Math.floor(wrap(x, w));
  const iy = Math.floor(wrap(y, h));
  deposits[iy * w + ix] += amount;
}

function diffuseAndDecay(
  trail: Float32Array,
  blur: Float32Array,
  w: number,
  h: number,
  decay: number,
  diffusion: number,
) {
  for (let y = 0; y < h; y += 1) {
    const row = y * w;
    const rowUp = ((y - 1 + h) % h) * w;
    const rowDown = ((y + 1) % h) * w;
    for (let x = 0; x < w; x += 1) {
      const left = (x - 1 + w) % w;
      const right = (x + 1) % w;
      const i = row + x;
      const avg =
        (trail[i] +
          trail[row + left] +
          trail[row + right] +
          trail[rowUp + x] +
          trail[rowDown + x]) *
        0.2;
      blur[i] = trail[i] * (1 - diffusion) + avg * diffusion;
    }
  }
  for (let i = 0; i < trail.length; i += 1) {
    trail[i] = blur[i] * decay;
  }
}

function applyFoodDeposits(
  trail: Float32Array,
  w: number,
  h: number,
  foods: FoodPoint[],
  strength: number,
) {
  const radius = Math.max(4, Math.round(Math.min(w, h) * 0.025));
  const r2 = radius * radius;
  for (const food of foods) {
    const cx = food.x * w;
    const cy = food.y * h;
    const amount = (food.strength ?? 2) * strength;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(w - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(h - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          const falloff = 1 - Math.sqrt(d2) / radius;
          trail[y * w + x] += amount * falloff;
        }
      }
    }
  }
}

/** 执行一帧模拟：感知 → 转向 → 移动 → 沉积 → 扩散衰减 → 食物补给。 */
export function stepPhysarum(
  state: PhysarumState,
  params: PhysarumParams,
  foods: FoodPoint[],
): void {
  const { width: w, height: h, trail, deposits, agents } = state;
  deposits.fill(0);

  const count = agents.length / 3;
  const sd = params.sensorDistance;
  const sa = params.sensorAngle;
  const ra = params.rotationAngle;
  const speed = params.moveSpeed;
  const deposit = params.depositAmount;

  for (let i = 0; i < count; i += 1) {
    const o = i * 3;
    let x = agents[o];
    let y = agents[o + 1];
    let angle = agents[o + 2];

    const sense = (offset: number) => {
      const a = angle + offset;
      return sampleTrail(trail, w, h, x + Math.cos(a) * sd, y + Math.sin(a) * sd);
    };

    const forward = sense(0);
    const left = sense(-sa);
    const right = sense(sa);

    if (left > right && left > forward) {
      angle -= ra;
    } else if (right > left && right > forward) {
      angle += ra;
    }

    x = wrap(x + Math.cos(angle) * speed, w);
    y = wrap(y + Math.sin(angle) * speed, h);

    agents[o] = x;
    agents[o + 1] = y;
    agents[o + 2] = angle;

    depositAt(deposits, w, h, x, y, deposit);
  }

  for (let i = 0; i < trail.length; i += 1) {
    trail[i] += deposits[i];
  }

  diffuseAndDecay(trail, state.blur, w, h, params.decay, params.diffusion);
  applyFoodDeposits(trail, w, h, foods, params.foodStrength);
  state.iteration += 1;
}

function trailValueToRgb(
  value: number,
  palette: PhysarumPalette,
  bg: [number, number, number],
): [number, number, number] {
  const stops = palette.colors.map((c) => parseHex(c));
  const v = Math.min(1, Math.max(0, value * palette.gain));
  if (v <= 0) return bg;
  const scaled = v * (stops.length - 1);
  const idx = Math.min(stops.length - 2, Math.floor(scaled));
  const t = scaled - idx;
  const rgb = lerpColor(stops[idx], stops[idx + 1], t);
  const mix = Math.min(1, v * 1.2);
  return lerpColor(bg, rgb, mix);
}

/** 把痕迹场渲染为 ImageData（最近邻放大到输出尺寸）。 */
export function renderPhysarum(
  state: PhysarumState,
  palette: PhysarumPalette,
  outWidth: number,
  outHeight: number,
): ImageData {
  const { trail, width, height } = state;
  const imageData = new ImageData(outWidth, outHeight);
  const data = imageData.data;
  const bg = parseHex(palette.background);
  const scaleX = width / outWidth;
  const scaleY = height / outHeight;

  for (let oy = 0; oy < outHeight; oy += 1) {
    const ty = Math.min(height - 1, Math.floor(oy * scaleY));
    const row = ty * width;
    const outRow = oy * outWidth;
    for (let ox = 0; ox < outWidth; ox += 1) {
      const tx = Math.min(width - 1, Math.floor(ox * scaleX));
      const t = trail[row + tx];
      const [r, g, b] = trailValueToRgb(t, palette, bg);
      const i = (outRow + ox) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }

  return imageData;
}
