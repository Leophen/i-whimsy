/**
 * Particle Life 人工生命 —— 物种交互矩阵 + 空间网格加速，零依赖。
 */

export interface ParticleLifeParams {
  speciesCount: number;
  particleCount: number;
  /** 交互半径，相对 min(width, height) 的比例 */
  rMaxRatio: number;
  friction: number;
  forceScale: number;
  dt: number;
  /** 拖尾时每帧叠加的背景不透明度 0–1 */
  trailOpacity: number;
  maxSpeed: number;
}

export interface ParticleLifeState {
  width: number;
  height: number;
  params: ParticleLifeParams;
  matrix: number[][];
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  species: Uint8Array;
  seed: number;
}

export interface ParticleLifePreset {
  id: string;
  name: string;
  description: string;
  speciesCount: number;
  matrix: number[][];
  particleCount?: number;
}

export const DEFAULT_PARTICLE_LIFE_PARAMS: ParticleLifeParams = {
  speciesCount: 4,
  particleCount: 8000,
  rMaxRatio: 0.08,
  friction: 0.85,
  forceScale: 1.2,
  dt: 0.35,
  trailOpacity: 0.12,
  maxSpeed: 6,
};

export const SPECIES_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#a29bfe',
  '#fd79a8',
  '#00b894',
  '#fab1a0',
  '#74b9ff',
];

export const PARTICLE_LIFE_BACKGROUND = '#050510';

function buildMatrix(rows: number[][]): number[][] {
  return rows.map((row) => [...row]);
}

/** 经典涌现形态预设 —— 手工筛选，随机矩阵多数会塌缩或飞散。 */
export const PARTICLE_LIFE_PRESETS: ParticleLifePreset[] = [
  {
    id: 'cells',
    name: '游动细胞',
    description: '两两抱团、彼此排斥的经典细胞形态',
    speciesCount: 4,
    matrix: buildMatrix([
      [0.55, 0.55, -0.6, -0.6],
      [0.55, 0.55, -0.6, -0.6],
      [-0.6, -0.6, 0.55, 0.55],
      [-0.6, -0.6, 0.55, 0.55],
    ]),
  },
  {
    id: 'vortex',
    name: '涡旋',
    description: '环形旋转与螺旋臂',
    speciesCount: 4,
    matrix: buildMatrix([
      [0, 0.85, 0, -0.85],
      [-0.85, 0, 0.85, 0],
      [0, -0.85, 0, 0.85],
      [0.85, 0, -0.85, 0],
    ]),
  },
  {
    id: 'atom',
    name: '原子轨道',
    description: '核与电子般的环状结构',
    speciesCount: 4,
    matrix: buildMatrix([
      [0, 0.9, 0, 0],
      [0.9, 0, 0, 0],
      [0, 0, 0, 0.9],
      [0, 0, 0.9, 0],
    ]),
  },
  {
    id: 'flock',
    name: '鱼群',
    description: '同类聚集、异类追逐的游动群',
    speciesCount: 3,
    matrix: buildMatrix([
      [0.6, -0.3, -0.5],
      [-0.3, 0.6, -0.5],
      [0.7, 0.7, -0.2],
    ]),
  },
  {
    id: 'chains',
    name: '链条',
    description: '首尾相连的链状结构',
    speciesCount: 5,
    matrix: buildMatrix([
      [0.5, 0.8, -0.5, -0.5, -0.5],
      [-0.5, 0.5, 0.8, -0.5, -0.5],
      [-0.5, -0.5, 0.5, 0.8, -0.5],
      [-0.5, -0.5, -0.5, 0.5, 0.8],
      [0.8, -0.5, -0.5, -0.5, 0.5],
    ]),
  },
  {
    id: 'crystal',
    name: '晶体',
    description: '六向对称的晶格聚集',
    speciesCount: 4,
    particleCount: 10000,
    matrix: buildMatrix([
      [0.7, -0.2, 0.4, -0.2],
      [-0.2, 0.7, -0.2, 0.4],
      [0.4, -0.2, 0.7, -0.2],
      [-0.2, 0.4, -0.2, 0.7],
    ]),
  },
  {
    id: 'predator',
    name: '捕食',
    description: '猎食者与猎物循环追逐',
    speciesCount: 4,
    matrix: buildMatrix([
      [0.5, 0.5, -0.7, -0.8],
      [0.5, 0.5, -0.7, -0.8],
      [0.8, 0.8, 0.3, -0.9],
      [-0.9, -0.9, 0.9, 0.2],
    ]),
  },
  {
    id: 'symbiosis',
    name: '共生',
    description: '多物种稳定共存的生态球',
    speciesCount: 5,
    matrix: buildMatrix([
      [0.4, 0.6, -0.4, -0.3, 0],
      [0.6, 0.4, 0, -0.4, -0.3],
      [-0.4, 0, 0.4, 0.6, -0.4],
      [-0.3, -0.4, 0.6, 0.4, 0],
      [0, -0.3, -0.4, 0, 0.5],
    ]),
  },
];

/** mulberry32 —— 可复现的伪随机数。 */
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

export function cloneMatrix(matrix: number[][]): number[][] {
  return matrix.map((row) => [...row]);
}

export function resizeMatrix(matrix: number[][], size: number, rand: () => number): number[][] {
  const next = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => {
      if (i < matrix.length && j < matrix[i].length) return matrix[i][j];
      return (rand() * 2 - 1) * 0.6;
    }),
  );
  return next;
}

export function generateRandomMatrix(speciesCount: number, seed?: number): number[][] {
  const rand = mulberry32(seed ?? Math.floor(Math.random() * 1_000_000));
  return Array.from({ length: speciesCount }, () =>
    Array.from({ length: speciesCount }, () => {
      const v = rand() * 2 - 1;
      return Math.round(v * 0.75 * 100) / 100;
    }),
  );
}

export function getPresetById(id: string): ParticleLifePreset | undefined {
  return PARTICLE_LIFE_PRESETS.find((p) => p.id === id);
}

export function createParticleLifeState(
  width: number,
  height: number,
  params: ParticleLifeParams,
  matrix: number[][],
  seed = Math.floor(Math.random() * 1_000_000),
): ParticleLifeState {
  const rand = mulberry32(seed);
  const n = params.particleCount;
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const vx = new Float32Array(n);
  const vy = new Float32Array(n);
  const species = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    x[i] = rand() * width;
    y[i] = rand() * height;
    vx[i] = (rand() - 0.5) * 0.5;
    vy[i] = (rand() - 0.5) * 0.5;
    species[i] = Math.floor(rand() * params.speciesCount);
  }

  return {
    width,
    height,
    params: { ...params },
    matrix: cloneMatrix(matrix),
    x,
    y,
    vx,
    vy,
    species,
    seed,
  };
}

function wrap(value: number, max: number): number {
  if (value < 0) return value + max;
  if (value >= max) return value - max;
  return value;
}

/** 三角核：中距最强，近距与远距趋零；配合矩阵正负实现吸引/排斥。 */
function interactionKernel(r: number, rMax: number): number {
  if (r <= 0 || r >= rMax) return 0;
  const t = r / rMax;
  return 1 - Math.abs(2 * t - 1);
}

export function stepParticleLife(state: ParticleLifeState): void {
  const { width, height, params, matrix, x, y, vx, vy, species } = state;
  const n = x.length;
  const rMax = params.rMaxRatio * Math.min(width, height);
  const cellSize = rMax;
  const cols = Math.max(1, Math.ceil(width / cellSize));
  const rows = Math.max(1, Math.ceil(height / cellSize));
  const grid = new Map<number, number[]>();

  const cellKey = (cx: number, cy: number) => cy * cols + cx;

  for (let i = 0; i < n; i++) {
    const cx = Math.min(cols - 1, Math.floor(x[i] / cellSize));
    const cy = Math.min(rows - 1, Math.floor(y[i] / cellSize));
    const key = cellKey(cx, cy);
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }

  const fx = new Float32Array(n);
  const fy = new Float32Array(n);
  const minR = 1.2;
  const repelRadius = rMax * 0.22;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const si = species[i];
    const cx = Math.min(cols - 1, Math.floor(xi / cellSize));
    const cy = Math.min(rows - 1, Math.floor(yi / cellSize));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ncx = cx + dx;
        const ncy = cy + dy;
        if (ncx < 0 || ncy < 0 || ncx >= cols || ncy >= rows) continue;
        const bucket = grid.get(cellKey(ncx, ncy));
        if (!bucket) continue;

        for (const j of bucket) {
          if (j <= i) continue;
          let ddx = x[j] - xi;
          let ddy = y[j] - yi;

          if (Math.abs(ddx) > rMax * 1.5) continue;
          if (Math.abs(ddy) > rMax * 1.5) continue;

          if (ddx > width * 0.5) ddx -= width;
          else if (ddx < -width * 0.5) ddx += width;
          if (ddy > height * 0.5) ddy -= height;
          else if (ddy < -height * 0.5) ddy += height;

          const distSq = ddx * ddx + ddy * ddy;
          if (distSq === 0 || distSq > rMax * rMax) continue;

          const dist = Math.sqrt(distSq);
          const invDist = 1 / Math.max(dist, minR);
          const sj = species[j];
          const attraction = matrix[si]?.[sj] ?? 0;
          const kernel = interactionKernel(dist, rMax);
          const force = kernel * attraction * params.forceScale;

          let fdx = (ddx * invDist) * force;
          let fdy = (ddy * invDist) * force;

          if (dist < repelRadius) {
            const repel = ((repelRadius - dist) / repelRadius) * 2.5;
            fdx -= (ddx * invDist) * repel;
            fdy -= (ddy * invDist) * repel;
          }

          fx[i] += fdx;
          fy[i] += fdy;
          fx[j] -= fdx;
          fy[j] -= fdy;
        }
      }
    }
  }

  const { friction, dt, maxSpeed } = params;

  for (let i = 0; i < n; i++) {
    let nvx = (vx[i] + fx[i] * dt) * friction;
    let nvy = (vy[i] + fy[i] * dt) * friction;
    const speed = Math.hypot(nvx, nvy);
    if (speed > maxSpeed) {
      nvx = (nvx / speed) * maxSpeed;
      nvy = (nvy / speed) * maxSpeed;
    }
    vx[i] = nvx;
    vy[i] = nvy;
    x[i] = wrap(x[i] + nvx, width);
    y[i] = wrap(y[i] + nvy, height);
  }
}

export function renderParticleLife(
  ctx: CanvasRenderingContext2D,
  state: ParticleLifeState,
  options: { trail: boolean; colors?: string[] },
): void {
  const { width, height, x, y, species, params } = state;
  const colors = options.colors ?? SPECIES_COLORS;

  if (options.trail) {
    ctx.fillStyle = `rgba(5, 5, 16, ${params.trailOpacity})`;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = PARTICLE_LIFE_BACKGROUND;
    ctx.fillRect(0, 0, width, height);
  }

  const n = x.length;
  const pointSize = Math.max(1.2, Math.min(width, height) / 280);

  for (let i = 0; i < n; i++) {
    const color = colors[species[i] % colors.length] ?? colors[0];
    ctx.fillStyle = color;
    ctx.fillRect(x[i] - pointSize * 0.5, y[i] - pointSize * 0.5, pointSize, pointSize);
  }
}

export function syncParticleCount(state: ParticleLifeState, targetCount: number): void {
  const current = state.x.length;
  if (targetCount === current) return;

  state.params.particleCount = targetCount;

  if (targetCount < current) {
    state.x = state.x.slice(0, targetCount);
    state.y = state.y.slice(0, targetCount);
    state.vx = state.vx.slice(0, targetCount);
    state.vy = state.vy.slice(0, targetCount);
    state.species = state.species.slice(0, targetCount);
    return;
  }

  const rand = mulberry32(state.seed + targetCount);
  const x = new Float32Array(targetCount);
  const y = new Float32Array(targetCount);
  const vx = new Float32Array(targetCount);
  const vy = new Float32Array(targetCount);
  const species = new Uint8Array(targetCount);

  x.set(state.x);
  y.set(state.y);
  vx.set(state.vx);
  vy.set(state.vy);
  species.set(state.species);

  for (let i = current; i < targetCount; i++) {
    x[i] = rand() * state.width;
    y[i] = rand() * state.height;
    vx[i] = (rand() - 0.5) * 0.5;
    vy[i] = (rand() - 0.5) * 0.5;
    species[i] = Math.floor(rand() * state.params.speciesCount);
  }

  state.x = x;
  state.y = y;
  state.vx = vx;
  state.vy = vy;
  state.species = species;
}

export function remapSpecies(state: ParticleLifeState, speciesCount: number): void {
  state.params.speciesCount = speciesCount;
  for (let i = 0; i < state.species.length; i++) {
    state.species[i] = state.species[i] % speciesCount;
  }
}
