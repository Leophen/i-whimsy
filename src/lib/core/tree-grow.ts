/**
 * 3D 空间殖民树生长 —— 吸引点 + 空间网格 + pipe model 加粗，零 React 依赖。
 */

export type CrownShape = 'sphere' | 'ellipsoid' | 'cone';
export type TreeSeason = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TreeGrowParams {
  seed: number;
  crownShape: CrownShape;
  attractionCount: number;
  /** 影响半径，相对 crownSize */
  influenceRatio: number;
  /** 单步生长长度，相对 crownSize */
  segmentRatio: number;
  branchAngle: number;
  apicalDominance: number;
  branchInterval: number;
  branchProbability: number;
  maxSteps: number;
  killRatio: number;
  leafRadiusRatio: number;
  crownSize: number;
  trunkHeight: number;
}

export interface TreeNode {
  x: number;
  y: number;
  z: number;
  parent: number;
}

export interface TreeTip {
  nodeIndex: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  age: number;
  isMain: boolean;
}

export interface TreeSegment {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  r1: number;
  r2: number;
}

export interface TreeGrowState {
  params: TreeGrowParams;
  nodes: TreeNode[];
  tips: TreeTip[];
  attraction: Float32Array;
  attractionActive: Uint8Array;
  activeCount: number;
  step: number;
  done: boolean;
  /** 运行时网格，不参与序列化 */
  _attractionGrid: AttractionGrid;
  _nodeGrid: NodeGrid;
  _queryBuffer: number[];
}

export interface TreeGenome {
  branchAngle: number;
  influenceRatio: number;
  apicalDominance: number;
  branchInterval: number;
  branchProbability: number;
}

export interface TreePreset {
  id: string;
  name: string;
  description: string;
  swatch: [string, string, string];
  params: Partial<TreeGrowParams>;
}

export interface SeasonPalette {
  sky: string;
  ground: string;
  trunk: string;
  branch: string;
  leaf: string;
  fog: string;
  showLeaves: boolean;
}

export interface EvolutionResult {
  generations: number;
  bestGenome: TreeGenome;
  bestFitness: number;
  fitnessHistory: number[];
  finalState: TreeGrowState;
}

export const DEFAULT_TREE_PARAMS: TreeGrowParams = {
  seed: 42_857,
  crownShape: 'sphere',
  attractionCount: 1200,
  influenceRatio: 0.11,
  segmentRatio: 0.018,
  branchAngle: 28,
  apicalDominance: 0.55,
  branchInterval: 4,
  branchProbability: 0.72,
  maxSteps: 280,
  killRatio: 0.012,
  leafRadiusRatio: 0.004,
  crownSize: 10,
  trunkHeight: 4,
};

export const TREE_PRESETS: TreePreset[] = [
  {
    id: 'oak',
    name: '橡树',
    description: '圆冠、主干明显',
    swatch: ['#5d4037', '#558b2f', '#8bc34a'],
    params: { crownShape: 'sphere', branchAngle: 32, apicalDominance: 0.6, branchInterval: 5 },
  },
  {
    id: 'pine',
    name: '松树',
    description: '锥形、向上伸展',
    swatch: ['#4e342e', '#2e7d32', '#1b5e20'],
    params: {
      crownShape: 'cone',
      branchAngle: 18,
      apicalDominance: 0.75,
      branchInterval: 6,
      branchProbability: 0.55,
    },
  },
  {
    id: 'willow',
    name: '柳树',
    description: '椭球冠、柔垂侧枝',
    swatch: ['#6d4c41', '#689f38', '#aed581'],
    params: {
      crownShape: 'ellipsoid',
      branchAngle: 42,
      apicalDominance: 0.35,
      branchInterval: 3,
      branchProbability: 0.85,
    },
  },
  {
    id: 'bush',
    name: '灌木',
    description: '低矮、多分枝',
    swatch: ['#795548', '#7cb342', '#c5e1a5'],
    params: {
      crownShape: 'sphere',
      trunkHeight: 1.2,
      crownSize: 6,
      branchAngle: 48,
      apicalDominance: 0.25,
      branchInterval: 2,
      branchProbability: 0.9,
      maxSteps: 220,
    },
  },
];

export const SEASON_PALETTES: Record<TreeSeason, SeasonPalette> = {
  spring: {
    sky: '#87ceeb',
    ground: '#7cb342',
    trunk: '#8d6e63',
    branch: '#689f38',
    leaf: '#a5d6a7',
    fog: '#e3f2fd',
    showLeaves: true,
  },
  summer: {
    sky: '#42a5f5',
    ground: '#558b2f',
    trunk: '#5d4037',
    branch: '#33691e',
    leaf: '#2e7d32',
    fog: '#bbdefb',
    showLeaves: true,
  },
  autumn: {
    sky: '#ffcc80',
    ground: '#8d6e63',
    trunk: '#4e342e',
    branch: '#6d4c41',
    leaf: '#ef6c00',
    fog: '#ffe0b2',
    showLeaves: true,
  },
  winter: {
    sky: '#b0bec5',
    ground: '#eceff1',
    trunk: '#4e342e',
    branch: '#5d4037',
    leaf: '#ffffff',
    fog: '#cfd8dc',
    showLeaves: false,
  },
};

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function paramsFromPreset(presetId: string, seed = DEFAULT_TREE_PARAMS.seed): TreeGrowParams {
  const preset = TREE_PRESETS.find((p) => p.id === presetId);
  return { ...DEFAULT_TREE_PARAMS, ...(preset?.params ?? {}), seed };
}

export function genomeFromParams(params: TreeGrowParams): TreeGenome {
  return {
    branchAngle: params.branchAngle,
    influenceRatio: params.influenceRatio,
    apicalDominance: params.apicalDominance,
    branchInterval: params.branchInterval,
    branchProbability: params.branchProbability,
  };
}

export function applyGenome(base: TreeGrowParams, genome: TreeGenome, seed: number): TreeGrowParams {
  return {
    ...base,
    seed,
    branchAngle: genome.branchAngle,
    influenceRatio: genome.influenceRatio,
    apicalDominance: genome.apicalDominance,
    branchInterval: Math.max(2, Math.round(genome.branchInterval)),
    branchProbability: genome.branchProbability,
  };
}

function normalize(x: number, y: number, z: number): [number, number, number] {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function randomInSphere(rand: () => number): [number, number, number] {
  const u = rand();
  const v = rand();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(rand());
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

function generateAttractions(params: TreeGrowParams, rand: () => number): Float32Array {
  const n = params.attractionCount;
  const out = new Float32Array(n * 3);
  const crownY = params.trunkHeight + params.crownSize * 0.55;
  const r = params.crownSize * 0.5;

  for (let i = 0; i < n; i++) {
    const [sx, sy, sz] = randomInSphere(rand);
    let x = sx;
    let y = sy;
    let z = sz;

    if (params.crownShape === 'ellipsoid') {
      y *= 0.65;
      x *= 1.15;
    } else if (params.crownShape === 'cone') {
      const h = rand();
      const coneR = (1 - h) * 0.85;
      const angle = rand() * Math.PI * 2;
      x = Math.cos(angle) * coneR * Math.sqrt(rand());
      z = Math.sin(angle) * coneR * Math.sqrt(rand());
      y = h * 0.9 - 0.1;
    }

    out[i * 3] = x * r;
    out[i * 3 + 1] = crownY + y * r;
    out[i * 3 + 2] = z * r;
  }
  return out;
}

class AttractionGrid {
  private readonly cellSize: number;
  private readonly cells = new Map<string, number[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  private key(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  insert(index: number, x: number, y: number, z: number): void {
    const k = this.key(x, y, z);
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(index);
    else this.cells.set(k, [index]);
  }

  query(x: number, y: number, z: number, radius: number, out: number[]): void {
    out.length = 0;
    const r = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          const bucket = this.cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (bucket) out.push(...bucket);
        }
      }
    }
  }
}

class NodeGrid {
  private cellSize: number;
  private readonly cells = new Map<string, number[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  setCellSize(cellSize: number): void {
    this.cellSize = cellSize;
  }

  private key(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  insert(index: number, x: number, y: number, z: number): void {
    const k = this.key(x, y, z);
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(index);
    else this.cells.set(k, [index]);
  }

  rebuild(nodes: TreeNode[]): void {
    this.clear();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      this.insert(i, n.x, n.y, n.z);
    }
  }

  query(x: number, y: number, z: number, radius: number, out: number[]): void {
    out.length = 0;
    const r = Math.ceil(radius / this.cellSize);
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          const bucket = this.cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (bucket) out.push(...bucket);
        }
      }
    }
  }
}

function rebuildAttractionGrid(state: TreeGrowState): void {
  const grid = state._attractionGrid;
  grid.clear();
  const { attraction, attractionActive } = state;
  for (let i = 0; i < attractionActive.length; i++) {
    if (!attractionActive[i]) continue;
    grid.insert(i, attraction[i * 3], attraction[i * 3 + 1], attraction[i * 3 + 2]);
  }
}

function killNearbyAttractions(state: TreeGrowState, killDistance: number): void {
  const { nodes, attraction, attractionActive } = state;
  state._nodeGrid.rebuild(nodes);
  const killSq = killDistance * killDistance;
  const buf = state._queryBuffer;

  for (let i = 0; i < attractionActive.length; i++) {
    if (!attractionActive[i]) continue;
    const ax = attraction[i * 3];
    const ay = attraction[i * 3 + 1];
    const az = attraction[i * 3 + 2];
    state._nodeGrid.query(ax, ay, az, killDistance, buf);
    for (const ni of buf) {
      const n = nodes[ni];
      const dx = ax - n.x;
      const dy = ay - n.y;
      const dz = az - n.z;
      if (dx * dx + dy * dy + dz * dz <= killSq) {
        attractionActive[i] = 0;
        state.activeCount -= 1;
        break;
      }
    }
  }
  rebuildAttractionGrid(state);
}

function perpendicular(dirX: number, dirY: number, dirZ: number): [number, number, number] {
  const ax = Math.abs(dirY) < 0.9 ? 0 : 1;
  const ay = Math.abs(dirY) < 0.9 ? 1 : 0;
  const az = 0;
  const cx = dirY * az - dirZ * ay;
  const cy = dirZ * ax - dirX * az;
  const cz = dirX * ay - dirY * ax;
  return normalize(cx, cy, cz);
}

function rotateAroundAxis(
  x: number,
  y: number,
  z: number,
  ax: number,
  ay: number,
  az: number,
  angle: number,
): [number, number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = ax * x + ay * y + az * z;
  const cx = ay * z - az * y;
  const cy = az * x - ax * z;
  const cz = ax * y - ay * x;
  return [
    x * c + cx * s + ax * dot * (1 - c),
    y * c + cy * s + ay * dot * (1 - c),
    z * c + cz * s + az * dot * (1 - c),
  ];
}

function createBranchTips(
  tip: TreeTip,
  params: TreeGrowParams,
  rand: () => number,
): TreeTip[] {
  const angleRad = (params.branchAngle * Math.PI) / 180;
  const [px, py, pz] = perpendicular(tip.dirX, tip.dirY, tip.dirZ);
  const main: TreeTip = { ...tip, age: 0, isMain: true };

  if (rand() > params.branchProbability) {
    return [main];
  }

  const sideCount = rand() > 0.35 ? 2 : 1;
  const tips: TreeTip[] = [main];

  for (let i = 0; i < sideCount; i++) {
    const sign = i === 0 ? 1 : -1;
    const [dx, dy, dz] = rotateAroundAxis(
      tip.dirX,
      tip.dirY,
      tip.dirZ,
      px,
      py,
      pz,
      sign * angleRad,
    );
    tips.push({
      nodeIndex: tip.nodeIndex,
      dirX: dx,
      dirY: dy,
      dirZ: dz,
      age: 0,
      isMain: false,
    });
  }
  return tips;
}

export function createTreeState(params: TreeGrowParams): TreeGrowState {
  const rand = mulberry32(params.seed);
  const attraction = generateAttractions(params, rand);
  const influence = params.crownSize * params.influenceRatio;
  const segLen = params.crownSize * params.segmentRatio;

  const nodes: TreeNode[] = [{ x: 0, y: 0, z: 0, parent: -1 }];
  const trunkSteps = Math.max(2, Math.ceil(params.trunkHeight / segLen));
  for (let i = 1; i <= trunkSteps; i++) {
    nodes.push({
      x: 0,
      y: Math.min(i * segLen, params.trunkHeight),
      z: 0,
      parent: i - 1,
    });
  }

  const tips: TreeTip[] = [
    {
      nodeIndex: nodes.length - 1,
      dirX: 0,
      dirY: 1,
      dirZ: 0,
      age: 0,
      isMain: true,
    },
  ];

  const state: TreeGrowState = {
    params,
    nodes,
    tips,
    attraction,
    attractionActive: new Uint8Array(params.attractionCount).fill(1),
    activeCount: params.attractionCount,
    step: 0,
    done: false,
    _attractionGrid: new AttractionGrid(influence),
    _nodeGrid: new NodeGrid(influence),
    _queryBuffer: [],
  };
  rebuildAttractionGrid(state);
  return state;
}

function growOneStep(state: TreeGrowState, rand: () => number): void {
  const { params } = state;
  const influence = params.crownSize * params.influenceRatio;
  const segLen = params.crownSize * params.segmentRatio;
  const buf = state._queryBuffer;
  const nextTips: TreeTip[] = [];

  for (const tip of state.tips) {
    const node = state.nodes[tip.nodeIndex];
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;
    let count = 0;

    state._attractionGrid.query(node.x, node.y, node.z, influence, buf);
    for (const ai of buf) {
      if (!state.attractionActive[ai]) continue;
      const ax = state.attraction[ai * 3];
      const ay = state.attraction[ai * 3 + 1];
      const az = state.attraction[ai * 3 + 2];
      const dx = ax - node.x;
      const dy = ay - node.y;
      const dz = az - node.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > influence || dist < 1e-4) continue;
      sumX += dx / dist;
      sumY += dy / dist;
      sumZ += dz / dist;
      count += 1;
    }

    if (count === 0) continue;

    let dirX = sumX / count;
    let dirY = sumY / count;
    let dirZ = sumZ / count;
    const dominance = tip.isMain ? params.apicalDominance : params.apicalDominance * 0.45;
    dirX = dirX * (1 - dominance) + tip.dirX * dominance;
    dirY = dirY * (1 - dominance) + tip.dirY * dominance;
    dirZ = dirZ * (1 - dominance) + tip.dirZ * dominance;
    [dirX, dirY, dirZ] = normalize(dirX, dirY, dirZ);

    const newNode: TreeNode = {
      x: node.x + dirX * segLen,
      y: node.y + dirY * segLen,
      z: node.z + dirZ * segLen,
      parent: tip.nodeIndex,
    };
    state.nodes.push(newNode);
    const newIndex = state.nodes.length - 1;

    const grown: TreeTip = {
      nodeIndex: newIndex,
      dirX,
      dirY,
      dirZ,
      age: tip.age + 1,
      isMain: tip.isMain,
    };

    if (grown.age >= params.branchInterval && grown.isMain) {
      nextTips.push(...createBranchTips(grown, params, rand));
    } else {
      nextTips.push(grown);
    }
  }

  state.tips = nextTips;
  killNearbyAttractions(state, params.crownSize * params.killRatio);
}

export function stepTreeGrow(state: TreeGrowState, steps = 1): boolean {
  const rand = mulberry32(state.params.seed + state.step * 7919);
  for (let i = 0; i < steps; i++) {
    if (state.done) return true;
    if (state.tips.length === 0 || state.activeCount <= 0) {
      state.done = true;
      return true;
    }
    growOneStep(state, rand);
    state.step += 1;
    if (state.step >= state.params.maxSteps) {
      state.done = true;
      return true;
    }
  }
  return state.done;
}

export function simulateTreeComplete(params: TreeGrowParams): TreeGrowState {
  const state = createTreeState(params);
  while (!stepTreeGrow(state, 8)) {
    /* 快速跑完 */
  }
  return state;
}

export function computeNodeRadii(state: TreeGrowState): Float32Array {
  const { nodes, params } = state;
  const leafR = params.crownSize * params.leafRadiusRatio;
  const children: number[][] = Array.from({ length: nodes.length }, () => []);
  for (let i = 1; i < nodes.length; i++) {
    children[nodes[i].parent]?.push(i);
  }

  const radii = new Float32Array(nodes.length);

  const visit = (index: number): number => {
    const kids = children[index];
    if (!kids.length) {
      radii[index] = leafR;
      return leafR * leafR;
    }
    let sumSq = 0;
    for (const child of kids) sumSq += visit(child);
    radii[index] = Math.sqrt(sumSq);
    return radii[index] * radii[index];
  };

  visit(0);
  radii[0] = Math.max(radii[0], leafR * 2.5);
  return radii;
}

export function buildSegments(state: TreeGrowState): TreeSegment[] {
  const radii = computeNodeRadii(state);
  const segments: TreeSegment[] = [];
  for (let i = 1; i < state.nodes.length; i++) {
    const parent = state.nodes[state.nodes[i].parent];
    const child = state.nodes[i];
    segments.push({
      x1: parent.x,
      y1: parent.y,
      z1: parent.z,
      x2: child.x,
      y2: child.y,
      z2: child.z,
      r1: radii[state.nodes[i].parent],
      r2: radii[i],
    });
  }
  return segments;
}

export function collectLeafPoints(state: TreeGrowState): Float32Array {
  const points: number[] = [];
  const { attraction, attractionActive } = state;
  for (let i = 0; i < attractionActive.length; i++) {
    if (!attractionActive[i]) continue;
    points.push(attraction[i * 3], attraction[i * 3 + 1], attraction[i * 3 + 2]);
  }
  return new Float32Array(points);
}

export function scoreTree(state: TreeGrowState): number {
  const { nodes, params } = state;
  if (nodes.length < 8) return 0;

  let maxY = 0;
  let spread = 0;
  for (const n of nodes) {
    maxY = Math.max(maxY, n.y);
    spread = Math.max(spread, Math.hypot(n.x, n.z));
  }

  const coverage = 1 - state.activeCount / params.attractionCount;
  const branchScore = Math.min(nodes.length / 120, 1.5);
  const heightScore = maxY / (params.trunkHeight + params.crownSize);
  const spreadScore = spread / (params.crownSize * 0.55);

  return heightScore * 45 + coverage * 35 + branchScore * 12 + spreadScore * 8;
}

function mutateGenome(genome: TreeGenome, rand: () => number, amount = 0.12): TreeGenome {
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  return {
    branchAngle: clamp(genome.branchAngle + (rand() - 0.5) * 18 * amount, 12, 55),
    influenceRatio: clamp(genome.influenceRatio + (rand() - 0.5) * 0.04 * amount, 0.06, 0.14),
    apicalDominance: clamp(genome.apicalDominance + (rand() - 0.5) * 0.25 * amount, 0.15, 0.85),
    branchInterval: clamp(
      Math.round(genome.branchInterval + (rand() - 0.5) * 3 * amount),
      2,
      8,
    ),
    branchProbability: clamp(genome.branchProbability + (rand() - 0.5) * 0.3 * amount, 0.35, 0.95),
  };
}

export function runEvolution(
  baseParams: TreeGrowParams,
  generations = 20,
  seed = baseParams.seed,
): EvolutionResult {
  const rand = mulberry32(seed);
  let genome = genomeFromParams(baseParams);
  let bestGenome = { ...genome };
  let bestFitness = -Infinity;
  let bestState = simulateTreeComplete(applyGenome(baseParams, genome, seed));
  bestFitness = scoreTree(bestState);
  const fitnessHistory = [bestFitness];

  for (let g = 1; g < generations; g++) {
    const candidates: TreeGenome[] = [{ ...genome }];
    for (let i = 0; i < 3; i++) candidates.push(mutateGenome(genome, rand));
    for (let i = 0; i < 2; i++) candidates.push(mutateGenome(bestGenome, rand, 0.08));

    let genBest = -Infinity;
    let genBestGenome = genome;

    for (let i = 0; i < candidates.length; i++) {
      const trialSeed = seed + g * 1000 + i * 17;
      const trialParams = applyGenome(
        { ...baseParams, maxSteps: Math.min(baseParams.maxSteps, 180) },
        candidates[i],
        trialSeed,
      );
      const trialState = simulateTreeComplete(trialParams);
      const fitness = scoreTree(trialState);
      if (fitness > genBest) {
        genBest = fitness;
        genBestGenome = candidates[i];
      }
    }

    genome = genBestGenome;
    fitnessHistory.push(genBest);
    if (genBest > bestFitness) {
      bestFitness = genBest;
      bestGenome = { ...genBestGenome };
      bestState = simulateTreeComplete(applyGenome(baseParams, bestGenome, seed + g * 999));
    }
  }

  return {
    generations,
    bestGenome,
    bestFitness,
    fitnessHistory,
    finalState: bestState,
  };
}

/** Wavefront OBJ —— 圆柱段近似为 6 棱柱。 */
export function exportTreeObj(state: TreeGrowState, name = 'tree'): string {
  const segments = buildSegments(state);
  const lines: string[] = [`# iWhimsy tree-grow`, `o ${name}`];
  let vertexOffset = 1;
  const sides = 6;

  for (const seg of segments) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    const [px, py, pz] = perpendicular(ux, uy, uz);
    const start = vertexOffset;

    for (let ring = 0; ring < 2; ring++) {
      const t = ring;
      const cx = seg.x1 + dx * t;
      const cy = seg.y1 + dy * t;
      const cz = seg.z1 + dz * t;
      const radius = ring === 0 ? seg.r1 : seg.r2;
      for (let s = 0; s < sides; s++) {
        const angle = (s / sides) * Math.PI * 2;
        const c = Math.cos(angle);
        const sA = Math.sin(angle);
        const ox = px * c + ux * sA;
        const oy = py * c + uy * sA;
        const oz = pz * c + uz * sA;
        lines.push(`v ${cx + ox * radius} ${cy + oy * radius} ${cz + oz * radius}`);
      }
    }

    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      const a = start + s;
      const b = start + sides + s;
      const c = start + sides + s2;
      const d = start + s2;
      lines.push(`f ${a} ${b} ${c}`);
      lines.push(`f ${a} ${c} ${d}`);
    }

    vertexOffset += sides * 2;
  }

  return lines.join('\n');
}
