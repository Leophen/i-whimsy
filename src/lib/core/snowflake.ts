/**
 * 六角网格冰晶生长 —— Gravner-Griffeath 简化模型，纯函数零依赖。
 * 在 1/6 扇区上模拟扩散限制凝聚，再六重对称展开。
 */

export interface SnowflakeParams {
  seed: number;
  /** 0 = 枝晶分枝，1 = 板状六角 */
  temperature: number;
  /** 水汽供给，影响生长速度与饱满度 */
  humidity: number;
  /** 网格半径（格数） */
  radius: number;
}

export interface SnowflakeCell {
  ice: boolean;
  mass: number;
  /** 结冰时的步数，用于着色 */
  generation: number;
}

export interface SnowflakeState {
  cells: Map<string, SnowflakeCell>;
  params: SnowflakeParams;
  step: number;
  maxSteps: number;
  done: boolean;
  frozenCount: number;
}

export interface SnowflakePreset {
  id: string;
  name: string;
  description: string;
  temperature: number;
  humidity: number;
  /** 缩略图渐变色 */
  swatch: [string, string, string];
}

export const DEFAULT_SNOWFLAKE_PARAMS: SnowflakeParams = {
  seed: 42_857,
  temperature: 0.35,
  humidity: 0.72,
  radius: 64,
};

export const SNOWFLAKE_PRESETS: SnowflakePreset[] = [
  {
    id: 'dendrite',
    name: '枝晶',
    description: '经典分枝树状',
    temperature: 0.12,
    humidity: 0.78,
    swatch: ['#1e3a5f', '#4a8fc4', '#e8f4fc'],
  },
  {
    id: 'plate',
    name: '六角板',
    description: '平整六边形盘',
    temperature: 0.88,
    humidity: 0.62,
    swatch: ['#2d4a6f', '#7bb8e0', '#ffffff'],
  },
  {
    id: 'fern',
    name: '蕨叶',
    description: '细密蕨类侧枝',
    temperature: 0.05,
    humidity: 0.82,
    swatch: ['#152238', '#3d7ab5', '#c5e8f7'],
  },
  {
    id: 'stellar',
    name: '星状',
    description: '六臂星芒',
    temperature: 0.42,
    humidity: 0.86,
    swatch: ['#1a3352', '#5a9fd4', '#f0f8ff'],
  },
  {
    id: 'needle',
    name: '针状',
    description: '细长冰针',
    temperature: 0.94,
    humidity: 0.38,
    swatch: ['#243b55', '#6ba3cc', '#dceef8'],
  },
  {
    id: 'fan',
    name: '扇形',
    description: '扇面展开纹理',
    temperature: 0.58,
    humidity: 0.52,
    swatch: ['#1f3550', '#6899c0', '#eef6fb'],
  },
];

const ICE_COLORS: [number, number, number][] = [
  [30, 58, 95],
  [45, 90, 135],
  [74, 143, 196],
  [123, 184, 224],
  [184, 223, 245],
  [232, 244, 252],
  [255, 255, 255],
];

/** mulberry32 —— 可复现伪随机。 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function cellKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function parseCellKey(key: string): [number, number] {
  const [q, r] = key.split(',').map(Number);
  return [q, r];
}

export function hexDistance(q: number, r: number): number {
  const s = -q - r;
  return (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2;
}

/** 60° 旋转（cube 坐标）。 */
export function rotateHex60(q: number, r: number): [number, number] {
  const s = -q - r;
  return [-r, -s];
}

/** 六重对称展开。 */
export function symmetricCoords(q: number, r: number): [number, number][] {
  const out: [number, number][] = [];
  let cq = q;
  let cr = r;
  for (let i = 0; i < 6; i += 1) {
    out.push([cq, cr]);
    [cq, cr] = rotateHex60(cq, cr);
  }
  return out;
}

/** 1/6 扇区：从东向逆时针 60°。 */
export function isInWedge(q: number, r: number): boolean {
  if (q < 0) return false;
  if (r > 0) return false;
  const s = -q - r;
  if (s > 0) return false;
  return true;
}

export function hexNeighbors(q: number, r: number): [number, number][] {
  return [
    [q + 1, r],
    [q - 1, r],
    [q, r + 1],
    [q, r - 1],
    [q + 1, r - 1],
    [q - 1, r + 1],
  ];
}

export function computeMaxSteps(radius: number): number {
  return Math.max(800, Math.round(radius * radius * 2.2));
}

export function createSnowflake(params: SnowflakeParams): SnowflakeState {
  const radius = Math.max(24, Math.min(120, Math.round(params.radius)));
  const cells = new Map<string, SnowflakeCell>();
  const clamped: SnowflakeParams = {
    ...params,
    temperature: clamp01(params.temperature),
    humidity: clamp01(params.humidity),
    radius,
  };

  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      if (hexDistance(q, r) > radius) continue;
      cells.set(cellKey(q, r), {
        ice: false,
        mass: clamped.humidity * 0.35 + 0.05,
        generation: -1,
      });
    }
  }

  const center = cells.get(cellKey(0, 0));
  if (center) {
    center.ice = true;
    center.generation = 0;
    center.mass = 0;
  }

  return {
    cells,
    params: clamped,
    step: 0,
    maxSteps: computeMaxSteps(radius),
    done: false,
    frozenCount: 1,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function cellNoise(seed: number, q: number, r: number): number {
  const h = Math.imul(q, 73856093) ^ Math.imul(r, 19349663) ^ seed;
  const rand = mulberry32(h >>> 0);
  return (rand() - 0.5) * 0.12;
}

function getCell(state: SnowflakeState, q: number, r: number): SnowflakeCell | undefined {
  return state.cells.get(cellKey(q, r));
}

function countIceNeighbors(state: SnowflakeState, q: number, r: number): number {
  let count = 0;
  for (const [nq, nr] of hexNeighbors(q, r)) {
    const n = getCell(state, nq, nr);
    if (n?.ice) count += 1;
  }
  return count;
}

function freezeWithSymmetry(state: SnowflakeState, q: number, r: number, generation: number): number {
  let added = 0;
  for (const [sq, sr] of symmetricCoords(q, r)) {
    const cell = getCell(state, sq, sr);
    if (!cell || cell.ice) continue;
    cell.ice = true;
    cell.generation = generation;
    cell.mass = 0;
    added += 1;
  }
  return added;
}

/** 执行若干生长步，返回本批新结冰格数。 */
export function stepSnowflake(state: SnowflakeState, steps = 1): number {
  if (state.done) return 0;
  const { params } = state;
  const rand = mulberry32(params.seed + state.step * 9973);
  const diffusion = 0.12 + params.humidity * 0.22;
  const supply = 0.04 + params.humidity * 0.1;
  const beta = 0.25 + params.temperature * 0.55;
  const radius = params.radius;

  let batchFrozen = 0;

  for (let s = 0; s < steps; s += 1) {
    if (state.done) break;

    const wedgeCells: [number, number][] = [];
    for (const key of state.cells.keys()) {
      const [q, r] = parseCellKey(key);
      if (!isInWedge(q, r)) continue;
      if (hexDistance(q, r) > radius) continue;
      wedgeCells.push([q, r]);
    }

    const pendingMass = new Map<string, number>();

    for (const [q, r] of wedgeCells) {
      const cell = getCell(state, q, r);
      if (!cell || cell.ice) continue;

      const iceN = countIceNeighbors(state, q, r);
      if (iceN === 0) continue;

      let mass = cell.mass;
      mass += supply * (0.6 + iceN / 6);

      let neighborSum = 0;
      let neighborCount = 0;
      for (const [nq, nr] of hexNeighbors(q, r)) {
        const n = getCell(state, nq, nr);
        if (!n) continue;
        neighborSum += n.mass;
        neighborCount += 1;
      }
      if (neighborCount > 0) {
        const laplacian = neighborSum / neighborCount - mass;
        const attach = Math.pow(iceN / 6, beta);
        mass += diffusion * laplacian * (0.35 + attach * 0.85);
      }

      mass += (rand() - 0.5) * 0.015 * (1 - params.temperature);
      pendingMass.set(cellKey(q, r), Math.max(0, mass));
    }

    for (const [key, mass] of pendingMass) {
      const cell = state.cells.get(key);
      if (!cell || cell.ice) continue;
      cell.mass = mass;
    }

    const toFreeze: [number, number][] = [];
    for (const [q, r] of wedgeCells) {
      const cell = getCell(state, q, r);
      if (!cell || cell.ice) continue;
      const iceN = countIceNeighbors(state, q, r);
      if (iceN === 0) continue;

      const noise = cellNoise(params.seed, q, r);
      const threshold = 0.82 + params.temperature * 0.28 + noise;
      const attachBoost = Math.pow(iceN / 6, beta) * 0.18;
      if (cell.mass + attachBoost >= threshold) {
        toFreeze.push([q, r]);
      }
    }

    let frozenThisStep = 0;
    for (const [q, r] of toFreeze) {
      const cell = getCell(state, q, r);
      if (!cell || cell.ice) continue;
      frozenThisStep += freezeWithSymmetry(state, q, r, state.step + 1);
    }

    state.step += 1;
    state.frozenCount += frozenThisStep;
    batchFrozen += frozenThisStep;

    const reachedEdge = state.frozenCount > 0 && hasReachedGrowthLimit(state);
    if (frozenThisStep === 0 || state.step >= state.maxSteps || reachedEdge) {
      state.done = true;
      break;
    }
  }

  return batchFrozen;
}

function hasReachedGrowthLimit(state: SnowflakeState): boolean {
  const limit = Math.PI * state.params.radius * state.params.radius * 0.55;
  return state.frozenCount >= limit;
}

/** 跑到稳定或步数上限。 */
export function simulateSnowflakeComplete(params: SnowflakeParams): SnowflakeState {
  const state = createSnowflake(params);
  while (!state.done) {
    stepSnowflake(state, 8);
  }
  return state;
}

function generationColor(generation: number, maxGen: number): [number, number, number, number] {
  if (generation < 0) return [0, 0, 0, 0];
  const t = maxGen <= 0 ? 0 : Math.min(1, generation / maxGen);
  const idx = t * (ICE_COLORS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(ICE_COLORS.length - 1, lo + 1);
  const f = idx - lo;
  const a = ICE_COLORS[lo];
  const b = ICE_COLORS[hi];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    255,
  ];
}

/** 渲染为透明背景 ImageData（尖顶六角布局）。 */
export function renderSnowflake(
  state: SnowflakeState,
  pixelSize: number,
  cellPixel = 0,
): ImageData {
  const size = Math.max(256, Math.round(pixelSize));
  const hexSize = cellPixel > 0 ? cellPixel : size / (state.params.radius * 2.8);
  const image = new ImageData(size, size);
  const data = image.data;
  const cx = size / 2;
  const cy = size / 2;
  const sqrt3 = Math.sqrt(3);

  let maxGen = 1;
  for (const cell of state.cells.values()) {
    if (cell.ice && cell.generation > maxGen) maxGen = cell.generation;
  }

  const radiusPx = Math.ceil(hexSize * 0.92);

  for (const [key, cell] of state.cells) {
    if (!cell.ice) continue;
    const [q, r] = parseCellKey(key);
    const x = cx + hexSize * (sqrt3 * q + (sqrt3 / 2) * r);
    const y = cy + hexSize * (1.5 * r);

    const [cr, cg, cb, ca] = generationColor(cell.generation, maxGen);
    const x0 = Math.floor(x - radiusPx);
    const y0 = Math.floor(y - radiusPx);
    const x1 = Math.ceil(x + radiusPx);
    const y1 = Math.ceil(y + radiusPx);

    for (let py = y0; py <= y1; py += 1) {
      for (let px = x0; px <= x1; px += 1) {
        if (px < 0 || py < 0 || px >= size || py >= size) continue;
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy > radiusPx * radiusPx) continue;
        const idx = (py * size + px) * 4;
        data[idx] = cr;
        data[idx + 1] = cg;
        data[idx + 2] = cb;
        data[idx + 3] = ca;
      }
    }
  }

  return image;
}

/** seed → 可读短码（如 XK7M-2P9Q）。 */
export function seedToCode(seed: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let n = Math.abs(Math.floor(seed)) || 1;
  let raw = '';
  for (let i = 0; i < 8; i += 1) {
    raw += chars[n % chars.length];
    n = Math.floor(n / chars.length);
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function codeToSeed(code: string): number | null {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length < 4) return null;
  let seed = 0;
  for (const ch of clean) {
    const idx = chars.indexOf(ch);
    if (idx < 0) return null;
    seed = seed * chars.length + idx;
  }
  return seed > 0 ? seed : null;
}

export function encodeSnowflakeHash(
  params: SnowflakeParams,
  presetId: string,
  speed: number,
): string {
  const p = [
    params.seed,
    Math.round(params.temperature * 100),
    Math.round(params.humidity * 100),
    params.radius,
    presetId,
    speed,
  ];
  return `#${p.join(',')}`;
}

export function decodeSnowflakeHash(hash: string): {
  params: Partial<SnowflakeParams>;
  presetId?: string;
  speed?: number;
} {
  const raw = hash.replace(/^#/, '');
  if (!raw) return { params: {} };
  const parts = raw.split(',');
  if (parts.length < 5) return { params: {} };
  return {
    params: {
      seed: Number(parts[0]),
      temperature: Number(parts[1]) / 100,
      humidity: Number(parts[2]) / 100,
      radius: Number(parts[3]),
    },
    presetId: parts[4],
    speed: parts[5] ? Number(parts[5]) : undefined,
  };
}

export function paramsFromPreset(presetId: string, seed?: number): SnowflakeParams {
  const preset = SNOWFLAKE_PRESETS.find((p) => p.id === presetId) ?? SNOWFLAKE_PRESETS[0];
  return {
    seed: seed ?? Math.floor(mulberry32(Date.now())() * 9_999_999),
    temperature: preset.temperature,
    humidity: preset.humidity,
    radius: 64,
  };
}
