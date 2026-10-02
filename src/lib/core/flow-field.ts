/**
 * 流场生成艺术 —— 噪声向量场 + 粒子拖尾，零依赖。
 */

export interface FlowPalette {
  id: string;
  name: string;
  background: string;
  colors: string[];
}

export interface FlowArtParams {
  seed: number;
  particleCount: number;
  speed: number;
  /** 每帧线段透明度 0–1 */
  trailOpacity: number;
  noiseScale: number;
  noiseStrength: number;
  lineWidth: number;
  maxLife: number;
}

export const DEFAULT_FLOW_PARAMS: FlowArtParams = {
  seed: 42_857,
  particleCount: 4000,
  speed: 1.2,
  trailOpacity: 0.018,
  noiseScale: 0.003,
  noiseStrength: 1,
  lineWidth: 0.6,
  maxLife: 280,
};

export const FLOW_PALETTES: FlowPalette[] = [
  {
    id: 'aurora',
    name: '极光',
    background: '#050814',
    colors: ['#7b5cff', '#00d4aa', '#ff6eb4', '#ffe566'],
  },
  {
    id: 'ember',
    name: '余烬',
    background: '#0a0505',
    colors: ['#ff4500', '#ff8c00', '#ffd700', '#8b0000'],
  },
  {
    id: 'ocean',
    name: '深海',
    background: '#020810',
    colors: ['#006994', '#00b4d8', '#90e0ef', '#03045e'],
  },
  {
    id: 'sakura',
    name: '樱',
    background: '#120810',
    colors: ['#ffb7c5', '#ff69b4', '#ffc0cb', '#fff0f5'],
  },
  {
    id: 'mono',
    name: '墨',
    background: '#0a0a0a',
    colors: ['#ffffff', '#cccccc', '#888888', '#444444'],
  },
  {
    id: 'neon',
    name: '霓虹',
    background: '#050510',
    colors: ['#00ffff', '#ff00ff', '#ffff00', '#00ff88'],
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

/** 简化的 2D value noise（足够流场使用）。 */
export function createNoise2D(seed: number): (x: number, y: number) => number {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) perm[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j] as number;
    perm[j] = tmp as number;
  }
  const grad = (h: number, x: number, y: number) => {
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);

  return (x: number, y: number) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[(perm[xi] + yi) & 255] as number;
    const ab = perm[(perm[xi] + yi + 1) & 255] as number;
    const ba = perm[(perm[xi + 1] + yi) & 255] as number;
    const bb = perm[(perm[xi + 1] + yi + 1) & 255] as number;
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v,
    );
  };
}

export interface FlowParticle {
  x: number;
  y: number;
  life: number;
  color: string;
}

export function createParticles(
  width: number,
  height: number,
  count: number,
  palette: FlowPalette,
  rand: () => number,
): FlowParticle[] {
  const out: FlowParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      x: rand() * width,
      y: rand() * height,
      life: Math.floor(rand() * 200),
      color: palette.colors[Math.floor(rand() * palette.colors.length)] as string,
    });
  }
  return out;
}

export function fieldAngle(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  scale: number,
  strength: number,
): number {
  const n = noise(x * scale, y * scale) * strength;
  return n * Math.PI * 2;
}

/** 编码参数到 URL hash。 */
export function encodeFlowHash(params: FlowArtParams, paletteId: string): string {
  const p = [
    params.seed,
    params.particleCount,
    Math.round(params.speed * 100),
    Math.round(params.trailOpacity * 1000),
    Math.round(params.noiseScale * 10000),
    paletteId,
  ];
  return `#${p.join(',')}`;
}

export function decodeFlowHash(hash: string): { params: Partial<FlowArtParams>; paletteId?: string } {
  const raw = hash.replace(/^#/, '');
  if (!raw) return { params: {} };
  const parts = raw.split(',');
  if (parts.length < 6) return { params: {} };
  return {
    params: {
      seed: Number(parts[0]),
      particleCount: Number(parts[1]),
      speed: Number(parts[2]) / 100,
      trailOpacity: Number(parts[3]) / 1000,
      noiseScale: Number(parts[4]) / 10000,
    },
    paletteId: parts[5],
  };
}
