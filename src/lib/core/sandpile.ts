/**
 * Abelian sandpile 元胞自动机 —— 纯函数，零依赖。
 * 从中心落沙，≥4 粒时向四邻各分一粒，稳定后形成分形曼陀罗。
 */

export interface SandpilePalette {
  /** 沙粒数 0 / 1 / 2 / 3 对应颜色 */
  colors: [string, string, string, string];
  background: string;
}

export interface SandpileState {
  size: number;
  grid: Int32Array;
  center: number;
  avalancheCount: number;
  dropped: number;
}

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
};

export function createSandpile(size: number): SandpileState {
  const s = Math.max(32, Math.min(1024, Math.round(size)));
  const center = Math.floor(s / 2);
  return {
    size: s,
    grid: new Int32Array(s * s),
    center,
    avalancheCount: 0,
    dropped: 0,
  };
}

/** 向中心加沙并稳定化，返回本次雪崩次数。 */
export function addGrains(state: SandpileState, count: number): number {
  const { grid, size, center } = state;
  const idx = center * size + center;
  grid[idx] += count;
  state.dropped += count;
  const avalanches = stabilize(state);
  state.avalancheCount += avalanches;
  return avalanches;
}

/** 活跃队列稳定化 —— 只检查刚变化的格子。 */
export function stabilize(state: SandpileState): number {
  const { grid, size } = state;
  const active = new Set<number>();
  let avalanches = 0;

  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] >= 4) active.add(i);
  }

  while (active.size > 0) {
    const next = new Set<number>();
    for (const idx of active) {
      const grains = grid[idx];
      if (grains < 4) continue;
      const topples = Math.floor(grains / 4);
      grid[idx] -= topples * 4;
      avalanches += topples;

      const y = Math.floor(idx / size);
      const x = idx % size;
      const neighbors = [
        y > 0 ? idx - size : -1,
        y < size - 1 ? idx + size : -1,
        x > 0 ? idx - 1 : -1,
        x < size - 1 ? idx + 1 : -1,
      ];
      for (const n of neighbors) {
        if (n < 0) continue;
        grid[n] += topples;
        if (grid[n] >= 4) next.add(n);
      }
      if (grid[idx] >= 4) next.add(idx);
    }
    active.clear();
    for (const n of next) active.add(n);
  }

  return avalanches;
}

/** 把当前格子状态渲染到 ImageData。 */
export function renderSandpile(
  state: SandpileState,
  palette: SandpilePalette,
  outWidth?: number,
): ImageData {
  const { grid, size } = state;
  const w = outWidth ?? size;
  const h = outWidth ?? size;
  const data = new Uint8ClampedArray(w * h * 4);
  const bg = parseHex(palette.background);
  const cols = palette.colors.map(parseHex);

  for (let oy = 0; oy < h; oy += 1) {
    for (let ox = 0; ox < w; ox += 1) {
      const sx = Math.floor((ox / w) * size);
      const sy = Math.floor((oy / h) * size);
      const grains = grid[sy * size + sx] ?? 0;
      const c = grains >= 3 ? cols[3] : cols[grains as 0 | 1 | 2] ?? bg;
      const i = (oy * w + ox) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, w, h);
}

export const SANDPILE_PALETTE_LABELS: Record<string, string> = {
  mandala: '曼陀罗',
  ocean: '海洋',
  ember: '余烬',
  forest: '森林',
  mono: '单色',
  neon: '霓虹',
};

export const SANDPILE_PALETTES: Record<string, SandpilePalette> = {
  mandala: {
    background: '#0f0a1a',
    colors: ['#1a1028', '#4a2d7a', '#c45cff', '#ffe566'],
  },
  ocean: {
    background: '#041018',
    colors: ['#0a2030', '#1a5070', '#3aa0c8', '#e0f8ff'],
  },
  ember: {
    background: '#120808',
    colors: ['#2a1010', '#8a3020', '#e06030', '#ffd080'],
  },
  forest: {
    background: '#081008',
    colors: ['#102018', '#286040', '#60a060', '#d0f0a0'],
  },
  mono: {
    background: '#000000',
    colors: ['#1a1a1a', '#444444', '#888888', '#eeeeee'],
  },
  neon: {
    background: '#050510',
    colors: ['#101030', '#3020a0', '#00e0ff', '#ff00aa'],
  },
};
